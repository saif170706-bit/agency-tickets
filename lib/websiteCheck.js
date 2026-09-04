// Tjek om en virksomhed allerede har en hjemmeside.
//
// Tre lag, i prioriteret rækkefølge:
//
//  1. CVR URL-felt     — gratis, øjeblikkelig, ingen netværksopkald.
//
//  2. SearXNG          — gratis, open-source metasøgemaskine.
//                        Sæt SEARXNG_URL i .env.local.
//
//  3. Brave Search     — gratis tier 2.000/md.
//                        Sæt BRAVE_SEARCH_API_KEY i .env.local.
//
//  4. DuckDuckGo HTML  — gratis fallback, ingen nøgle.
//
// Alle søgeresultater kræver nu at det fundne domæne navnemæssigt
// matcher firmaet (domainMatchesCompany) — undgår falske positiver
// fra krak/trustpilot og lignende kataloger.
// Domænegætning (tidligere lag 5) er fjernet — gav for mange falske
// positiver da parkeringssider svarer med 200/301 på næsten alle domæner.

const IGNORE_HOSTS = [
  "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com",
  "cvr.dk", "virk.dk", "datacvr.virk.dk", "krak.dk", "degulesider.dk",
  "proff.dk", "opendi.dk", "wikipedia.org", "trustpilot.com",
  "google.com", "google.dk", "bing.com", "118.dk", "cvrapi.dk",
  "indeed.com", "jobindex.dk", "eniro.dk", "gulasidur.fo",
  "business.site", "youtube.com", "tiktok.com", "maps.google.com",
  "apple.com", "yelp.com", "foursquare.com",
];

const STOP_WORDS = new Set([
  "aps", "as", "ivs", "is", "ks", "holding", "group", "smba", "amba",
  "selskabet", "selskab", "virksomhed", "firma", "og", "for", "den",
  "det", "de", "dk", "com", "net", "org", "the", "ved", "men",
  "hus", "service", "services", "center", "centret", "shop",
]);

function transliterate(str) {
  return str
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa");
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function isRealBusinessDomain(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return !IGNORE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function buildSearchQuery(companyName, city) {
  const cleanName = (companyName || "")
    .replace(/\b(aps|a\/s|ivs|i\/s|k\/s|holding|smba|amba)\b/gi, "")
    .trim();
  return city ? `"${cleanName}" ${city}` : `"${cleanName}" hjemmeside`;
}

// Returnerer true hvis domænet ser ud til at tilhøre netop dette firma
// (mindst ét signifikant ord fra firmanavnet skal fremgå af hostnamen)
function significantWords(companyName) {
  return transliterate(companyName || "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
}

// Svarer resultaterne overhovedet på det der blev spurgt om?
// Bing leverer tilsyneladende gyldige resultater om vidt andre emner når
// den strømbegrænser — 10 træffere om Microsoft på en søgning efter en
// café. Nævner intet resultat et ord fra firmanavnet, er svaret ubrugeligt,
// og det må ikke forveksles med at firmaet ikke har en hjemmeside.
function resultsLookRelevant(results, companyName) {
  const words = significantWords(companyName);
  if (!words.length) return true;
  const blob = transliterate(
    results.map((r) => `${r.url || ""} ${r.title || ""} ${r.content || ""}`).join(" ")
  );
  return words.some((w) => blob.includes(w));
}

function domainMatchesCompany(url, companyName) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").replace(/\.\w+$/, ""); // fjern TLD
    const hostTrans = transliterate(host);
    const words = significantWords(companyName);
    return words.some((w) => hostTrans.includes(w));
  } catch {
    return false;
  }
}

// ── Lag 2: SearXNG ─────────────────────────────────────────────────────────
// JSON-API kræver at format=json er aktiveret i instansens settings.yml:
//   search:
//     formats:
//       - html
//       - json     ← tilføj denne linje
//
// Self-host på Railway: deploy https://github.com/searxng/searxng-docker
// Offentlige instanser: se https://searx.space (filtrer på "json" support)
async function searchSearXNG(companyName, city) {
  const baseUrl = process.env.SEARXNG_URL;
  if (!baseUrl) return { ok: false, url: null }; // ikke konfigureret

  const query = buildSearchQuery(companyName, city);
  // Bing + Google CSE virker på Railway. Plain google/DDG/Brave/Startpage er CAPTCHA-blokeret.
  const url = `${baseUrl.replace(/\/$/, "")}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=da&engines=bing%2Cgoogle+cse`;

  try {
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (leadfinder-bot/1.0)",
        },
      },
      8000
    );
    if (!res.ok) return { ok: false, url: null };
    const data = await res.json();
    const results = data?.results || [];
    if (results.length && !resultsLookRelevant(results, companyName)) {
      return { ok: false, url: null }; // motoren svarede på noget andet
    }
    const urls = results.map((r) => r.url).filter(Boolean);
    // Kræv navnematch ligesom Brave/DDG — undgår falske positiver fra kataloger
    const hit = urls.find((u) => isRealBusinessDomain(u) && domainMatchesCompany(u, companyName)) || null;
    return { ok: true, url: hit };
  } catch {
    return { ok: false, url: null };
  }
}

// ── Lag 3: Brave Search API ────────────────────────────────────────────────
async function searchBrave(companyName, city) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return { ok: false, url: null };

  const query = buildSearchQuery(companyName, city);
  try {
    const res = await fetchWithTimeout(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&country=dk&search_lang=da`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      },
      6000
    );
    if (!res.ok) return { ok: false, url: null };
    const data = await res.json();
    const urls = (data?.web?.results || []).map((r) => r.url);
    // Kræv at domænet faktisk matcher firmanavnet — undgår falske positiver
    const hit = urls.find((u) => isRealBusinessDomain(u) && domainMatchesCompany(u, companyName)) || null;
    return { ok: true, url: hit };
  } catch {
    return { ok: false, url: null };
  }
}

// ── Lag 4: DuckDuckGo HTML fallback ────────────────────────────────────────
async function searchDuckDuckGo(companyName, city) {
  const query = buildSearchQuery(companyName, city);
  try {
    const res = await fetchWithTimeout(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (leadfinder-bot/1.0)" } },
      6000
    );
    if (!res.ok) return { ok: false, url: null };
    const html = await res.text();
    const matches = [...html.matchAll(/class="result__a"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    // Tomt svar betyder som regel blokering, ikke at firmaet mangler side
    if (!matches.length) return { ok: false, url: null };
    // Kræv navnematch — undgår at krak.dk / trustpilot-lignende sider tæller
    const hit = matches.slice(0, 8).find(
      (u) => isRealBusinessDomain(u) && domainMatchesCompany(u, companyName)
    ) || null;
    return { ok: true, url: hit };
  } catch {
    return { ok: false, url: null };
  }
}

// Lag 5 (domænegætning) er fjernet — for mange falske positiver:
// parkeringssider og ikke-relaterede .dk-domæner svarede altid,
// hvilket betød at alle virksomheder fejlagtigt fik "hjemmeside fundet".

// Returnerer { found, url, method }
// knownCvrUrl: URL direkte fra CVR-registret
async function hasWebsite(companyName, city, knownCvrUrl = null) {
  // ── Lag 1: CVR URL-felt ─────────────────────────────────────────────────
  if (knownCvrUrl) {
    const url = knownCvrUrl.startsWith("http") ? knownCvrUrl : `https://${knownCvrUrl}`;
    if (isRealBusinessDomain(url)) {
      return { found: true, checked: true, url, method: "cvr-felt" };
    }
  }

  // Lag 2-4. Hvert lag melder tilbage om det overhovedet kunne søge.
  // Den skelnen er hele pointen: et opslag der fejler betyder ikke at
  // firmaet mangler en hjemmeside, og må derfor ikke blive til et lead.
  const layers = [
    ["searxng", searchSearXNG],
    ["brave-search", searchBrave],
    ["duckduckgo", searchDuckDuckGo],
  ];

  let anySearched = false;
  for (const [method, fn] of layers) {
    const r = await fn(companyName, city);
    if (r && r.ok) {
      anySearched = true;
      if (r.url) return { found: true, checked: true, url: r.url, method };
    }
  }

  // Kunne mindst ét lag søge uden at finde noget? Så er fraværet reelt.
  // Kunne ingen af dem, ved vi det ikke — og siger det i stedet for at gætte.
  return anySearched
    ? { found: false, checked: true, url: null, method: "søgt uden fund" }
    : { found: false, checked: false, url: null, method: "kunne ikke tjekkes" };
}

module.exports = { hasWebsite };

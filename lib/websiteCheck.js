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
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
    .replace(/é|è|ê/g, "e").replace(/á|à/g, "a");
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

// ── Lag 2: domænegæt med indholdstjek ──────────────────────────────────────
// Tidligere fjernet fordi den kun så på statuskoden, og parkeringssider
// svarer 200 på nærmest alt. Her hentes siden og det kræves at den rent
// faktisk nævner firmaet — det falder parkeringssider ikke igennem.
// Gratis, ubegrænset, ingen nøgle, kan ikke strømbegrænses.

// Ord der er for generiske til at staa alene som domaene: cafe.dk siger
// intet om "Cafe Vanilla", men ville naevne ordet "cafe" og bestaa tjekket.
const GENERIC_SLUGS = new Set([
  "cafe", "kafe", "restaurant", "bistro", "pizzeria", "grill", "kro",
  "klinik", "tandlaege", "dyrlaege", "laege", "salon", "frisoer",
  "murer", "toemrer", "elektriker", "maler", "vvs", "auto", "byg",
  "bageri", "blomster", "butik", "boghandel", "revisor", "advokat",
  "frisor", "tandlage", "dyrlage", "lage", "tomrer", "salon", "klinik",
  "firma", "firmaet", "malerfirmaet", "murermester", "vaerksted", "vinduer",
]);

// Danske domaener skriver oftest ae/oe/aa som a/o/a: frisorkarina.dk, ikke
// frisoerkarina.dk. Vi proever begge former, plus bindestreg mellem ordene,
// som i salon-matin.dk.
function simpleVowels(str) {
  return str.toLowerCase()
    .replace(/æ|ä/g, "a").replace(/ø|ö/g, "o").replace(/å/g, "a")
    .replace(/ü/g, "u").replace(/é|è|ê/g, "e").replace(/á|à/g, "a");
}

function wordsFrom(name, mapper) {
  return mapper(name || "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function domainCandidates(companyName) {
  const forms = [significantWords(companyName), wordsFrom(companyName, simpleVowels)];
  const out = [];
  for (const words of forms) {
    if (!words.length) continue;
    // Er hvert eneste ord generisk, beskriver navnet en branche, ikke et
    // firma: "Frisør Salon" ville ramme frisorsalon.dk, som tilhoerer en
    // helt anden. Saa springes formen over.
    if (words.every((w) => GENERIC_SLUGS.has(w))) continue;
    out.push(words.join(""));                                  // heleFirmaNavnet
    if (words.length > 1) {
      out.push(words.join("-"));                               // hele-firma-navnet
      out.push(words.slice(0, 2).join(""));
      out.push(words.slice(0, 2).join("-"));
      if (!GENERIC_SLUGS.has(words[0])) out.push(words[0]);
    }
  }
  return [...new Set(out)].filter((w) => w.length >= 4 && w.length <= 40);
}

async function searchDomainGuess(companyName) {
  const cands = domainCandidates(companyName);
  if (!cands.length) return { ok: false, url: null };

  const words = significantWords(companyName);
  let reachedAny = false;

  for (const slug of cands.slice(0, 6)) {
    try {
      const res = await fetchWithTimeout(
        `https://${slug}.dk`,
        { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (leadfinder-bot/1.0)" } },
        6000
      );
      if (!res.ok) continue;
      reachedAny = true;
      const html = (await res.text()).slice(0, 120000);
      const body = transliterate(html.replace(/<[^>]+>/g, " "));
      // Siden skal naevne firmaet. Ét ord raekker kun hvis navnet ér ét ord:
      // murermester.dk naevner "murermester", men er ikke Murermester Jens
      // Hansens side. Flerordede navne skal genfindes med mindst to ord.
      const hits = words.filter((w) => body.includes(w)).length;
      if (hits >= Math.min(2, words.length)) {
        return { ok: true, url: res.url || `https://${slug}.dk` };
      }
    } catch {
      // navnet opslaas ikke, eller siden svarer ikke — proev naeste
    }
  }
  // Vigtigt: dette lag maa kun bekraefte, aldrig afvise. At vi ikke gættede
  // domaenet siger intet om hvorvidt firmaet har en side — den kan hedde
  // hvad som helst. Kun et rigtigt soegeopslag kan fastslaa fravaer.
  void reachedAny;
  return { ok: false, url: null };
}

// ── Lag 3: SearXNG ─────────────────────────────────────────────────────────
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
    ["domaenegaet", searchDomainGuess],
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

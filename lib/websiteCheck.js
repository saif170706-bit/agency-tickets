// Tjek om en virksomhed allerede har en hjemmeside.
//
// Tre lag, i prioriteret raekkefoelge:
//
//  1. CVR URL-felt   — gratis, oejeblikkelig, ingen netvaerksopkald.
//  2. Domaenegaet    — gratis: gaet domaenet ud fra navnet og bekraeft at
//                      siden rent faktisk naevner firmaet.
//  3. Claude-soegning — koeres samlet for alle uafklarede virksomheder fra
//                      lib/autoLeads.js, se lib/claudeCheck.js.
//
// Lag 1 og 2 kan kun BEKRAEFTE at en hjemmeside findes. Kun lag 3 kan
// fastslaa at den ikke findes — derfor returnerer denne fil checked:false
// naar de to foerste lag ikke rammer, i stedet for at melde "ingen side".
// De gratis soegemaskiner (SearXNG, Brave, DuckDuckGo) er fjernet: de svarede
// med urelaterede resultater eller CAPTCHA, og hvert fejlslag blev et lead.

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

// Returnerer true hvis domænet ser ud til at tilhøre netop dette firma
// (mindst ét signifikant ord fra firmanavnet skal fremgå af hostnamen)
function significantWords(companyName) {
  return transliterate(companyName || "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
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

  // ── Lag 2: domænegætning ────────────────────────────────────────────────
  // Gratis og hurtigt, men kan kun bekræfte. Rammer den ikke, ved vi intet —
  // et miss betyder ikke at firmaet mangler en hjemmeside.
  const guess = await searchDomainGuess(companyName, city);
  if (guess && guess.ok && guess.url) {
    return { found: true, checked: true, url: guess.url, method: "domaenegaet" };
  }

  // De gratis søgemaskiner (SearXNG, Brave, DuckDuckGo) blev fjernet fra
  // kæden: de svarede enten med urelaterede resultater eller med CAPTCHA fra
  // datacenter-IP'er, og hver fejlet søgning blev til et falsk lead. Lag 3 er
  // nu et Claude-opslag, som køres samlet for alle uafklarede virksomheder i
  // lib/autoLeads.js — derfor stopper vi her og melder "ikke afgjort".
  return { found: false, checked: false, url: null, method: "kunne ikke tjekkes" };
}

module.exports = { hasWebsite };

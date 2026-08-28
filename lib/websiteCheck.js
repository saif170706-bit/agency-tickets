// Bedste-forsøg-tjek af, om en virksomhed allerede har en hjemmeside.
// Ingen betalt søge-API krævet — bruger domænegætning + et gratis DuckDuckGo-opslag.
//
// VIGTIGT: Dette er heuristik, ikke en garanti. Falske positiver/negativer kan
// forekomme (fx virksomheder der kun har en Facebook-side, eller hvor gættet
// domænenavn er forkert). Brug det som en første sortering — sælgerne bør
// stadig selv tjekke, før de skriver en virksomhed helt af.

const IGNORE_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "cvr.dk",
  "virk.dk",
  "krak.dk",
  "degulesider.dk",
  "proff.dk",
  "opendi.dk",
  "wikipedia.org",
  "trustpilot.com",
  "google.com",
  "118.dk",
  "cvrapi.dk",
  "datacvr.virk.dk",
  "indeed.com",
  "jobindex.dk",
];

function normalizeCompanyName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/\b(aps|a\/s|as|ivs|i\/s|k\/s|holding|group|smba|amba)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function guessDomains(name) {
  const base = normalizeCompanyName(name);
  if (!base) return [];
  return [`${base}.dk`, `${base}.com`];
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function domainRespondsAsWebsite(domain) {
  try {
    const res = await fetchWithTimeout(
      `https://${domain}`,
      { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (leadfinder-bot)" } },
      4000
    );
    // Domæneparkerings-/salgssider svarer ofte også 200 — vi kan ikke skelne
    // perfekt, men et vellykket svar er stadig et rimeligt signal om "findes".
    return res.ok || (res.status >= 300 && res.status < 400);
  } catch {
    return false;
  }
}

function isRealBusinessDomain(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    return !IGNORE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

async function searchDuckDuckGo(query) {
  try {
    const res = await fetchWithTimeout(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (leadfinder-bot)" } },
      5000
    );
    if (!res.ok) return [];
    const html = await res.text();
    const matches = [...html.matchAll(/class="result__a"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    return matches.slice(0, 5);
  } catch {
    return [];
  }
}

// Returnerer { found, url, method } for om virksomheden ser ud til at have en hjemmeside.
async function hasWebsite(companyName, city) {
  for (const domain of guessDomains(companyName)) {
    if (await domainRespondsAsWebsite(domain)) {
      return { found: true, url: `https://${domain}`, method: "domaingaet" };
    }
  }

  const query = `"${companyName}" ${city || ""}`.trim();
  const links = await searchDuckDuckGo(query);
  const match = links.find(isRealBusinessDomain);
  if (match) {
    return { found: true, url: match, method: "soegning" };
  }

  return { found: false, url: null, method: "ingen" };
}

module.exports = { hasWebsite };

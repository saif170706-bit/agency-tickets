// Tjek om en virksomhed allerede har en hjemmeside.
//
// Kun ét lag her: CVR's eget URL-felt. Har virksomheden en hjemmeside
// registreret i CVR, er sagen afgjort gratis og øjeblikkeligt, og den skal
// slet ikke videre til et net-opslag.
//
// Alt andet afgøres af Claude, som søger på nettet — se lib/claudeCheck.js.
// Tidligere lag er fjernet undervejs, hver især fordi de gættede forkert:
// SearXNG/Bing svarede med urelaterede resultater, Brave og DuckDuckGo
// blokerede os fra datacenter-IP'er, og domænegætningen ramte domæner der
// tilhørte andre virksomheder med lignende navne.

const IGNORE_HOSTS = [
  "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com",
  "cvr.dk", "virk.dk", "datacvr.virk.dk", "krak.dk", "degulesider.dk",
  "proff.dk", "opendi.dk", "wikipedia.org", "trustpilot.com",
  "google.com", "google.dk", "bing.com", "118.dk", "cvrapi.dk",
  "indeed.com", "jobindex.dk", "eniro.dk", "gulasidur.fo",
  "business.site", "youtube.com", "tiktok.com", "maps.google.com",
  "apple.com", "yelp.com", "foursquare.com",
];

// En Facebook-side er ikke en hjemmeside. Står der sådan et link i CVR,
// tæller det ikke, og virksomheden går videre til Claude.
function isRealBusinessDomain(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return !IGNORE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

// Returnerer { found, checked, url, method }.
// checked:false betyder "ved det ikke" — ikke "har ingen hjemmeside".
function hasWebsite(companyName, city, knownCvrUrl = null) {
  if (knownCvrUrl) {
    const url = knownCvrUrl.startsWith("http") ? knownCvrUrl : `https://${knownCvrUrl}`;
    if (isRealBusinessDomain(url)) {
      return { found: true, checked: true, url, method: "cvr-felt" };
    }
  }
  return { found: false, checked: false, url: null, method: "ikke afgjort" };
}

module.exports = { hasWebsite };

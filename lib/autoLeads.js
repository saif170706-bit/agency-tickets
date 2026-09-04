const { searchCvr } = require("./cvr");
const { hasWebsite } = require("./websiteCheck");
const { saveLeads, getSavedCvrNumbers } = require("./leads");

const CONCURRENCY = 5;

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const i = index++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

// Henter kandidater fra CVR for en eller flere brancher, tjekker hver for
// en eksisterende hjemmeside, og gemmer kun dem UDEN hjemmeside som leads.
// Hvert element i brancheQueries kan enten være en præcis 6-cifret DB07-
// branchekode (foretrukket, se lib/cvr.js SUGGESTED_BRANCHES) eller en
// fritekststreng som fallback.
async function autoDiscoverLeads({ brancheQueries, postnummer, perBranche = 15 }, employee) {
  if (!Array.isArray(brancheQueries) || brancheQueries.length === 0) {
    throw new Error("Vælg mindst én branche");
  }

  // Alt vi allerede har fundet før (uanset status) — bedes CVR om at
  // udelade, så vi ikke spilder tid på at gentjekke kendte virksomheder.
  const excludeCvrNumbers = getSavedCvrNumbers();

  const seen = new Set();
  const candidates = [];

  for (const q of brancheQueries) {
    const isCode = /^\d{4,6}$/.test(q);
    const { results } = await searchCvr({
      branchekode: isCode ? q : undefined,
      brancheTekst: isCode ? undefined : q,
      postnummer: postnummer || undefined,
      kunUdenReklamebeskyttelse: true,
      kunAktive: true,
      excludeCvrNumbers,
      size: perBranche,
    });
    for (const r of results) {
      if (seen.has(r.cvrNummer)) continue;
      seen.add(r.cvrNummer);
      candidates.push(r);
    }
  }

  const checked = await runWithConcurrency(candidates, CONCURRENCY, async (c) => {
    // Send CVR's eget URL-felt med som første check — sparer søgning for de fleste
    const check = await hasWebsite(c.navn, c.by, c.hjemmeside || null);
    return { ...c, check };
  });

  const METHOD_LABEL = {
    "cvr-felt": "CVR-registret",
    "brave-search": "Brave-søgning",
    "duckduckgo": "DuckDuckGo-søgning",
    "domaingaet": "domænegætning",
    "søgt uden fund": "søgning uden resultat",
    "kunne ikke tjekkes": "tjek mislykkedes",
    "ingen": "ingen metode",
  };

  // Kun virksomheder hvor tjekket faktisk lykkedes og intet blev fundet.
  // Uden check.checked ville hver eneste fejlet søgning blive et falsk lead,
  // hvilket er præcis hvad der skete da Bing begyndte at svare med skrald.
  const uncheckable = checked.filter((c) => c.check.checked === false).length;

  const withoutWebsite = checked
    .filter((c) => c.check.checked !== false && !c.check.found)
    .map((c) => ({
      ...c,
      source: "auto (ingen hjemmeside fundet)",
      note: `Automatisk tjek ${new Date().toLocaleDateString("da-DK")}: ingen hjemmeside fundet (tjekket via ${METHOD_LABEL[c.check.method] || c.check.method})`,
    }));

  const saveResult = withoutWebsite.length ? saveLeads(withoutWebsite, employee) : { added: 0, skipped: 0 };

  return {
    uncheckable,
    candidatesChecked: checked.length,
    withoutWebsite: withoutWebsite.length,
    withWebsite: checked.length - withoutWebsite.length,
    ...saveResult,
  };
}

module.exports = { autoDiscoverLeads };

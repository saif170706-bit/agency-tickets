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
    const check = await hasWebsite(c.navn, c.by);
    return { ...c, check };
  });

  const withoutWebsite = checked
    .filter((c) => !c.check.found)
    .map((c) => ({
      ...c,
      source: "auto (ingen hjemmeside fundet)",
      note: `Automatisk tjek: ingen hjemmeside fundet (${new Date().toLocaleDateString("da-DK")})`,
    }));

  const saveResult = withoutWebsite.length ? saveLeads(withoutWebsite, employee) : { added: 0, skipped: 0 };

  return {
    candidatesChecked: checked.length,
    withoutWebsite: withoutWebsite.length,
    withWebsite: checked.length - withoutWebsite.length,
    ...saveResult,
  };
}

module.exports = { autoDiscoverLeads };

const { searchCvr } = require("./cvr");
const { hasWebsite } = require("./websiteCheck");
const { saveLeads, getSavedCvrNumbers, queueForVerification } = require("./leads");
const { checkWithClaude, BATCH_SIZE } = require("./claudeCheck");

const PAGE_SIZE = 25; // kandidater hentet fra CVR pr. branche pr. runde

// Søger indtil der er fundet det ønskede antal RIGTIGE leads — virksomheder
// med et telefonnummer, som er blevet slået op og bekræftet ikke at have en
// hjemmeside. Søgningen er først færdig når målet er nået, ikke når et vist
// antal virksomheder er gennemgået: hvor mange kandidater det kræver, ved vi
// ikke på forhånd, for de fleste viser sig at have en side i forvejen.
//
// onProgress kaldes undervejs, så kaldstedet kan strømme status til browseren.
// Uden den ville forbindelsen ligge tavs i mange minutter og blive lukket.
async function autoDiscoverLeads(
  { brancheQueries, postnummer, target = 15, maxCandidates = 300 },
  employee,
  onProgress = () => {}
) {
  if (!Array.isArray(brancheQueries) || brancheQueries.length === 0) {
    throw new Error("Vælg mindst én branche");
  }

  const excludeCvrNumbers = getSavedCvrNumbers();
  const seen = new Set();

  let examined = 0; // virksomheder vi har brugt et opslag på
  let skippedNoPhone = 0;
  let withWebsite = 0;
  let unresolved = 0; // hverken be- eller afkræftet, lagt i kø
  let leadsFound = 0;
  let exhausted = false;

  // Hver branche hentes side for side, så vi kan blive ved med at grave
  // dybere hvis de første kandidater alle viser sig at have en hjemmeside.
  const offsets = new Map(brancheQueries.map((q) => [q, 0]));

  async function nextCandidates() {
    const batch = [];
    for (const q of brancheQueries) {
      const from = offsets.get(q);
      if (from === null) continue; // denne branche er tom
      const isCode = /^\d{4,6}$/.test(q);
      const { results } = await searchCvr({
        branchekode: isCode ? q : undefined,
        brancheTekst: isCode ? undefined : q,
        postnummer: postnummer || undefined,
        kunUdenReklamebeskyttelse: true,
        kunAktive: true,
        excludeCvrNumbers,
        from,
        size: PAGE_SIZE,
      });
      if (!results.length) {
        offsets.set(q, null);
        continue;
      }
      offsets.set(q, from + PAGE_SIZE);
      for (const r of results) {
        if (seen.has(r.cvrNummer)) continue;
        seen.add(r.cvrNummer);
        batch.push(r);
      }
    }
    return batch;
  }

  while (leadsFound < target && examined < maxCandidates) {
    const candidates = await nextCandidates();
    if (!candidates.length) {
      exhausted = true;
      break;
    }

    // Et lead vi ikke kan ringe til er ikke et lead. Frasorteres før vi
    // bruger opslag på dem.
    const callable = candidates.filter((c) => c.telefon);
    skippedNoPhone += candidates.length - callable.length;
    if (!callable.length) continue;

    onProgress({
      phase: "tjekker",
      message: `Gennemgår ${callable.length} virksomheder med telefonnummer…`,
      leadsFound,
      target,
      examined,
    });

    // Runde 1: CVR's eget URL-felt. Gratis og øjeblikkeligt, og har de en
    // hjemmeside registreret dér, skal de slet ikke videre til Claude.
    const checked = callable.map((c) => ({
      ...c,
      check: hasWebsite(c.navn, c.by, c.hjemmeside || null),
    }));
    examined += checked.length;

    const confirmed = checked.filter((c) => c.check.found);
    withWebsite += confirmed.length;

    let queue = checked.filter((c) => !c.check.found);
    if (!queue.length) continue;

    // Runde 2: Claude søger på nettet. Vi tager kun så mange batches som der
    // er brug for — er målet nået undervejs, stopper vi.
    for (let i = 0; i < queue.length && leadsFound < target; i += BATCH_SIZE) {
      const batch = queue.slice(i, i + BATCH_SIZE);
      onProgress({
        phase: "soeger",
        message: `Slår ${batch.length} virksomheder op på nettet…`,
        leadsFound,
        target,
        examined,
      });

      const verdicts = await checkWithClaude(
        batch.map((c) => ({ id: c.cvrNummer, navn: c.navn, by: c.by, branchetekst: c.branchetekst }))
      );

      const newLeads = [];
      const stillUnknown = [];
      for (const c of batch) {
        const v = verdicts.get(String(c.cvrNummer));
        if (!v) {
          stillUnknown.push(c);
        } else if (v.found) {
          withWebsite++;
        } else {
          newLeads.push({
            ...c,
            source: "auto (ingen hjemmeside fundet)",
            note: `Automatisk tjek ${new Date().toLocaleDateString("da-DK")}: ingen hjemmeside fundet (slået op på nettet)`,
          });
        }
      }

      // Gemmes med det samme, batch for batch. Skulle kørslen blive afbrudt,
      // er det der allerede er fundet ikke gået tabt. Rammer en batch forbi
      // målet, gemmes overskuddet også — de er fundet, og de er rigtige.
      if (newLeads.length) {
        saveLeads(newLeads, employee);
        leadsFound += newLeads.length;
      }

      if (stillUnknown.length) {
        unresolved += queueForVerification(
          stillUnknown.map((c) => ({ ...c, reason: "kunne ikke afgøres" }))
        );
      }

      onProgress({
        phase: "fundet",
        message: `${leadsFound} af ${target} leads fundet`,
        leadsFound,
        target,
        examined,
      });
    }
  }

  return {
    leadsFound,
    target,
    reachedTarget: leadsFound >= target,
    examined,
    withWebsite,
    skippedNoPhone,
    unresolved,
    exhausted,
    stoppedAtLimit: examined >= maxCandidates && leadsFound < target,
  };
}

module.exports = { autoDiscoverLeads };

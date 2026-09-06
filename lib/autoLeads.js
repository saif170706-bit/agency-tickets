const { searchCvr } = require("./cvr");
const { hasWebsite } = require("./websiteCheck");
const { getSavedCvrNumbers, queueForVerification } = require("./leads");

const PAGE_SIZE = 25; // kandidater hentet fra CVR pr. branche pr. runde

// Finder kandidater til leads og lægger dem i verifikationskøen.
//
// Der slås IKKE op på nettet her. Det gjorde vi før, og det brændte hele
// abonnementets forbrugsgrænse på én søgning: at afgøre 100 virksomheder
// koster hundrede websøgninger, og de fleste af dem viser sig alligevel at
// have en hjemmeside. I stedet laves der en liste, som slås op i en
// almindelig Claude-samtale, hvor søgningen er gratis, og svaret sættes
// tilbage ind i systemet.
//
// De eneste der frasorteres her, er dem vi kan afgøre gratis:
// virksomheder uden telefonnummer (dem kan vi ikke ringe til), og
// virksomheder der allerede har en hjemmeside registreret i CVR.
async function findCandidates({ brancheQueries, postnummer, antal = 35 }) {
  if (!Array.isArray(brancheQueries) || brancheQueries.length === 0) {
    throw new Error("Vælg mindst én branche");
  }

  const excludeCvrNumbers = getSavedCvrNumbers();
  const seen = new Set();
  const candidates = [];

  let skippedNoPhone = 0;
  let withWebsite = 0;
  let examined = 0;
  let exhausted = false;

  const offsets = new Map(brancheQueries.map((q) => [q, 0]));

  while (candidates.length < antal) {
    let gotAny = false;

    for (const q of brancheQueries) {
      if (candidates.length >= antal) break;
      const from = offsets.get(q);
      if (from === null) continue; // denne branche er tømt

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
      gotAny = true;

      for (const r of results) {
        if (candidates.length >= antal) break;
        if (seen.has(r.cvrNummer)) continue;
        seen.add(r.cvrNummer);
        examined++;

        if (!r.telefon) {
          skippedNoPhone++;
          continue;
        }
        if (hasWebsite(r.navn, r.by, r.hjemmeside || null).found) {
          withWebsite++;
          continue;
        }
        candidates.push(r);
      }
    }

    if (!gotAny) {
      exhausted = true;
      break;
    }
  }

  const queued = candidates.length ? queueForVerification(candidates) : 0;

  return { queued, examined, skippedNoPhone, withWebsite, exhausted };
}

module.exports = { findCandidates };

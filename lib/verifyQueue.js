// Tømmer verifikationskøen ved at spørge Claude om hver virksomhed har en
// hjemmeside, og skriver svarene tilbage som leads.
//
// Hvorfor en kø og ikke bare et opslag midt i søgningen: ét Claude-opslag med
// ti virksomheder tager omkring et halvt minut, så en søgning med halvtreds
// uafklarede ville holde HTTP-requesten åben i mange minutter og time ud.
// Køen tømmes derfor i baggrunden på serveren, lige efter søgningen svarer.
// Siden det hele kører på Railway, kræver det ikke at din pc er tændt.

const { checkWithClaude, isAvailable } = require("./claudeCheck");
const { listVerificationQueue, applyVerification } = require("./leads");

let running = false;

function isRunning() {
  return running;
}

// limit: hvor mange virksomheder der højst tages med i denne omgang.
async function drainVerificationQueue({ limit = 50 } = {}) {
  if (running) return { skipped: "kører allerede" };
  if (!isAvailable()) return { skipped: "Claude-tjek er ikke konfigureret" };

  running = true;
  try {
    const queue = listVerificationQueue(limit);
    if (!queue.length) return { newLeads: 0, hadWebsite: 0, stillUnsure: 0, remaining: 0 };

    const results = await checkWithClaude(
      queue.map((c) => ({
        id: c.cvrNummer,
        navn: c.navn,
        by: c.by,
        branchetekst: c.branchetekst,
      }))
    );

    // Virksomheder Claude ikke kunne afgøre optræder ikke i svaret. De bliver
    // liggende i køen af sig selv, fordi applyVerification kun fjerner dem
    // den får et svar på.
    const verdicts = [...results.entries()].map(([cvrNummer, r]) => ({
      cvrNummer,
      harHjemmeside: r.found,
      url: r.url,
      sikkerhed: "hoej",
    }));

    return applyVerification(verdicts, "Claude-søgning");
  } finally {
    running = false;
  }
}

// Starter tømningen uden at vente på den — bruges lige efter en søgning har
// svaret browseren, så brugeren ikke sidder og venter på Claude.
function drainInBackground(opts) {
  setImmediate(() => {
    drainVerificationQueue(opts).catch((e) =>
      console.error(`Verifikationskø fejlede: ${e.message}`)
    );
  });
}

module.exports = { drainVerificationQueue, drainInBackground, isRunning };

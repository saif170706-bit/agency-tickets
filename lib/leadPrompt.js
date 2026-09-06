const { listVerificationQueue, applyVerification } = require("./leads");

// Bygger den tekst der kopieres over i en Claude-samtale. Svaret derfra
// sættes tilbage i systemet, og derfor beder vi udtrykkeligt om CVR-numre:
// navne kan skrives på et utal af måder, et ottecifret tal kan kun læses
// på én. Adresse og telefon skal med, fordi mange små virksomheder driver
// deres side under et butiks- eller kædenavn i stedet for CVR-navnet —
// det var sådan Jessen Hairstyle slap igennem som falsk lead.
function buildPrompt(limit = 50) {
  const items = listVerificationQueue(limit);
  if (!items.length) return { count: 0, prompt: "" };

  const list = items
    .map((c) => {
      const adresse = [c.vej, [c.postnummer, c.by].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ");
      return `${c.cvrNummer} | ${c.navn}${adresse ? ` | ${adresse}` : ""}${
        c.telefon ? ` | tlf. ${c.telefon}` : ""
      }${c.branchetekst ? ` | ${c.branchetekst}` : ""}`;
    })
    .join("\n");

  const prompt = `Jeg har ${items.length} danske virksomheder herunder. Slå hver enkelt op på nettet og afgør om den har en hjemmeside.

Sådan afgør du det:
- Søg på firmanavnet, og søg også på telefonnummeret hvis navnet ikke giver noget.
- Mange små virksomheder driver deres side under et butiksnavn eller et kædenavn i stedet for det navn de står registreret med i CVR. Sådan en side TÆLLER som deres hjemmeside. Afgør det på adresse og telefonnummer, ikke på om navnet er ens.
- Følgende tæller IKKE som en hjemmeside: Facebook, Instagram, LinkedIn, krak.dk, degulesider.dk, proff.dk, findsmiley.dk, cvr-opslag, virksomhedsdatabaser, booking-portaler og markedspladser.
- Er du i tvivl, så tag den IKKE med. Alt hvad du ikke nævner, bliver behandlet som om det har en hjemmeside og bliver ikke ringet op — det er den sikre fejl. Et forkert lead koster et spildt opkald til en virksomhed der allerede har en side.

Svar KUN med CVR-numrene på dem der IKKE har en hjemmeside — ét pr. linje, intet andet. Ingen forklaring, ingen navne, ingen overskrift.

VIRKSOMHEDER:
${list}`;

  return { count: items.length, prompt };
}

// Læser det indsatte svar. Alt der ligner et CVR-nummer, og som findes i
// køen, regnes som "ingen hjemmeside" og bliver til et lead. Resten af
// køen har så en hjemmeside og udelades fremover.
//
// Med vilje tolerant over for formatering: svaret kommer klippet ud af en
// samtale og kan have punktopstilling, bindestreger eller mellemrum med.
function applyAnswer(text, savedBy = "manuel verifikation", { force = false } = {}) {
  const queue = listVerificationQueue(500);
  if (!queue.length) throw new Error("Der er ingen virksomheder i køen at afgøre");

  const inQueue = new Set(queue.map((c) => String(c.cvrNummer)));
  // Linje for linje, så to numre under hinanden ikke smelter sammen til ét
  // sekstencifret rod. Mellemrum, punktum og bindestreg inde i et tal fjernes
  // først, så "33 333 333" og "33-333-333" læses som samme nummer.
  const nævnt = new Set(
    String(text)
      .split(/\r?\n/)
      .flatMap((linje) => linje.replace(/(?<=\d)[ .\-](?=\d)/g, "").match(/(?<!\d)\d{8}(?!\d)/g) || [])
  );

  const udenHjemmeside = [...nævnt].filter((n) => inQueue.has(n));
  const ukendte = [...nævnt].filter((n) => !inQueue.has(n));

  if (!udenHjemmeside.length) {
    throw new Error(
      ukendte.length
        ? `Ingen af de ${ukendte.length} CVR-numre i teksten står i køen. Er svaret fra en anden søgning?`
        : "Fandt ingen CVR-numre i teksten."
    );
  }

  // Bliver næsten hele omgangen nævnt, er det som regel fordi hele
  // samtalen — inklusive den oprindelige liste — er blevet indsat. Erfaringen
  // siger at omkring en tredjedel mangler en hjemmeside, så 90 % er et
  // faresignal, ikke et resultat. Uden det her ville hele listen stille og
  // roligt blive til leads.
  if (!force && queue.length >= 5 && udenHjemmeside.length / queue.length > 0.9) {
    const err = new Error(
      `Teksten nævner ${udenHjemmeside.length} ud af ${queue.length} virksomheder. ` +
        `Har du indsat hele samtalen i stedet for kun svaret? Indsæt kun CVR-numrene på dem uden hjemmeside.`
    );
    err.kraeverBekraeftelse = true;
    throw err;
  }

  const verdicts = queue.map((c) => ({
    cvrNummer: String(c.cvrNummer),
    harHjemmeside: !udenHjemmeside.includes(String(c.cvrNummer)),
    url: null,
    sikkerhed: "hoej",
  }));

  return { ...applyVerification(verdicts, savedBy), ukendte: ukendte.length };
}

module.exports = { buildPrompt, applyAnswer };

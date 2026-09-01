// SMS-skabeloner per sagstype og fase.
// Bruges i SmsModal til at give medarbejderen et godt udgangspunkt.

const COMPANY = process.env.COMPANY_NAME || "BuildOne";
const SIGN = `Med venlig hilsen ${COMPANY}`;

// Maksimum SMS-længde vi tillader (2 SMS-segmenter)
export const SMS_MAX_CHARS = 306;

// Skabeloner: igang-fasen
export const IGANG = {
  support: (name, _ref, url) =>
    `Hej ${name}, vi er gået i gang med at undersøge dit problem. Du kan følge status her: ${url}. ${SIGN}`,
  vedligeholdelse: (name, _ref, url) =>
    `Hej ${name}, vi er i gang med vedligeholdelsen af din hjemmeside. Du kan følge status her: ${url}. ${SIGN}`,
  byggeri: (name, _ref, url) =>
    `Hej ${name}, vi er gået i gang med at bygge din nye hjemmeside. Følg fremgangen her: ${url}. ${SIGN}`,
  opdatering: (name, _ref, url) =>
    `Hej ${name}, vi er gået i gang med opdateringen af din hjemmeside. Følg status her: ${url}. ${SIGN}`,
  // Baglæns kompatibilitet med gammel "build"-type
  build: (name, ref, url) => IGANG.byggeri(name, ref, url),
};

// Skabeloner: lukket-fasen
export const LUKKET = {
  support: (name, _ref, _url) =>
    `Hej ${name}, dit problem er nu løst. Tjek gerne din hjemmeside og skriv til os, hvis noget stadig driller. ${SIGN}`,
  vedligeholdelse: (name, _ref, _url) =>
    `Hej ${name}, vedligeholdelsen er færdig. Din hjemmeside er opdateret og klar. ${SIGN}`,
  byggeri: (name, _ref, _url) =>
    `Hej ${name}, din nye hjemmeside er nu live! Tjek den ud og giv os besked, hvad du synes. ${SIGN}`,
  opdatering: (name, _ref, _url) =>
    `Hej ${name}, opdateringen af din hjemmeside er færdig og live. ${SIGN}`,
  build: (name, ref, url) => LUKKET.byggeri(name, ref, url),
};

// Menneskevenlige typnavne
export const TYPE_LABELS = {
  support: "Support",
  vedligeholdelse: "Vedligeholdelse",
  byggeri: "Hjemmeside byggeri",
  opdatering: "Hjemmeside opdatering",
  build: "Hjemmeside byggeri", // baglæns kompatibilitet
};

// Alle typer medarbejderen kan vælge imellem i modalen
export const ALL_TYPES = ["support", "vedligeholdelse", "byggeri", "opdatering"];

// Hjælpefunktion: returnér tekst for et givet type + fase
export function getTemplate(stage, type, name, ref, url) {
  const map = stage === "lukket" ? LUKKET : IGANG;
  const fn = map[type] || map.support;
  return fn(name || "kunde", ref, url);
}

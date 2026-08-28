// Klient til Erhvervsstyrelsens CVR "system-til-system"-adgang (Elasticsearch 6.8).
// Kræver CVR_USERNAME + CVR_PASSWORD i .env.local (fra jeres brugeroprettelse hos ERST).
//
// Feltstier og -typer herunder er bekræftet mod en LEVENDE test af den rigtige
// API (inkl. et kig i den rigtige _mapping), ikke kun dokumentationen — så
// disse bør være korrekte:
//   - Endpoint: http://distribution.virk.dk/cvr-permanent/virksomhed/_search
//     (kun almindelig HTTP, ikke HTTPS — det er sådan ERST selv har sat det
//     op, bekræftet i deres officielle eksempler)
//   - "reklamebeskyttet" (ikke "reklamebeskyttelse") — boolean
//   - "sammensatStatus" og "nyesteHovedbranche.branchekode/-tekst" er type
//     "text" (analyseret), IKKE keyword — brug derfor "match", ikke "term"
//   - Telefon/e-mail ligger som ARRAYS af historiske kontaktoplysninger
//     (med en "hemmelig"-markering og gyldighedsperiode), ikke som en enkelt
//     streng — se pickCurrentContact() herunder

const CVR_API_URL =
  process.env.CVR_API_URL || "http://distribution.virk.dk/cvr-permanent/virksomhed/_search";

function getAuthHeader() {
  const user = process.env.CVR_USERNAME;
  const pass = process.env.CVR_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "CVR_USERNAME / CVR_PASSWORD mangler i .env.local. Tilføj dem for at kunne søge i CVR."
    );
  }
  const token = Buffer.from(`${user}:${pass}`).toString("base64");
  return `Basic ${token}`;
}

// Officielle DB07-branchekoder fra Danmarks Statistiks nomenklatur
// (dst.dk/da/Statistik/dokumentation/nomenklaturer/db), verificeret mod
// levende data. Præcis kode-match giver LANGT flere/renere resultater end
// fritekstsøgning, fordi det også fanger ældre/alternative label-stavemåder
// under samme branchekode (fx gav "Tømrere" 36.070 med kode vs. kun 1.949
// med fritekst).
const SUGGESTED_BRANCHES = [
  { label: "Frisører & skønhedssaloner", branchekode: "962100" }, // 96.21.00
  { label: "Cafeer & restauranter", branchekode: "561110" }, // 56.11.10
  { label: "Tømrere & snedkere", branchekode: "433200" }, // 43.32.00
  { label: "Elektrikere", branchekode: "432100" }, // 43.21.00
  { label: "VVS-installatører", branchekode: "432200" }, // 43.22.00
  { label: "Malerfirmaer", branchekode: "433410" }, // 43.34.10
  { label: "Autoværksteder", branchekode: "953190" }, // 95.31.90
  { label: "Skønhedspleje & wellness", branchekode: "962200" }, // 96.22.00
  { label: "Detailhandel, specialforretninger", branchekode: "477800" }, // 47.78.00
  { label: "Fitnesscentre", branchekode: "931300" }, // 93.13.00
  { label: "Murerarbejde", branchekode: "439100" }, // 43.91.00
  { label: "Rengøringsfirmaer", branchekode: "812100" }, // 81.21.00
  { label: "Bedemandsforretninger", branchekode: "963000" }, // 96.30.00
  { label: "Fotografer", branchekode: "742000" }, // 74.20.00
  { label: "Tandlæger", branchekode: "862300" }, // 86.23.00
  { label: "Fysio- og ergoterapi", branchekode: "869500" }, // 86.95.00
  { label: "Alternativ behandling & massage", branchekode: "869600" }, // 86.96.00
  { label: "Grafisk design", branchekode: "741200" }, // 74.12.00
  { label: "Ejendomsmæglere", branchekode: "683110" }, // 68.31.10
  { label: "Dyrlæger", branchekode: "750000" }, // 75.00.00
];

// Kun de felter vi rent faktisk bruger — Erhvervsstyrelsens egen vejledning
// beder eksplicit om at begrænse _source, ellers risikerer man midlertidig
// spærring for ikke at belaste deres Elasticsearch-drift unødigt.
const SOURCE_FIELDS = [
  "Vrvirksomhed.cvrNummer",
  "Vrvirksomhed.reklamebeskyttet",
  "Vrvirksomhed.telefonNummer",
  "Vrvirksomhed.elektroniskPost",
  "Vrvirksomhed.virksomhedMetadata.nyesteNavn.navn",
  "Vrvirksomhed.virksomhedMetadata.sammensatStatus",
  "Vrvirksomhed.virksomhedMetadata.nyesteHovedbranche.branchekode",
  "Vrvirksomhed.virksomhedMetadata.nyesteHovedbranche.branchetekst",
  "Vrvirksomhed.virksomhedMetadata.nyesteBeliggenhedsadresse",
];

function buildQuery({
  branchekode,
  brancheTekst,
  kommuneKode,
  postnummer,
  kunUdenReklamebeskyttelse,
  kunAktive,
  excludeCvrNumbers,
  from = 0,
  size = 25,
}) {
  const must = [];
  const filter = [];
  const mustNot = [];

  // Sørg for kun at ramme virksomheds-dokumenter (ikke produktionsenheder)
  filter.push({ exists: { field: "Vrvirksomhed.cvrNummer" } });

  // Spring virksomheder over, vi allerede har fundet/gemt før — så en ny
  // søgning giver friske kandidater i stedet for at gentage sig selv.
  if (Array.isArray(excludeCvrNumbers) && excludeCvrNumbers.length > 0) {
    mustNot.push({ terms: { "Vrvirksomhed.cvrNummer": excludeCvrNumbers } });
  }

  if (kunAktive !== false) {
    filter.push({ match: { "Vrvirksomhed.virksomhedMetadata.sammensatStatus": "NORMAL" } });
  }

  if (kunUdenReklamebeskyttelse) {
    filter.push({ term: { "Vrvirksomhed.reklamebeskyttet": false } });
  }

  if (branchekode) {
    // Præcis kode-match (feltet er type "text", så "match" i stedet for "term")
    filter.push({
      match: { "Vrvirksomhed.virksomhedMetadata.nyesteHovedbranche.branchekode": branchekode },
    });
  } else if (brancheTekst) {
    // Fritekst-fallback, når man ikke har en præcis branchekode at søge på.
    // query_string, som ERST selv anbefaler til fritekstsøgning på tekst-felter.
    must.push({
      query_string: {
        default_field: "Vrvirksomhed.virksomhedMetadata.nyesteHovedbranche.branchetekst",
        query: brancheTekst,
      },
    });
  }

  if (kommuneKode) {
    filter.push({
      term: { "Vrvirksomhed.virksomhedMetadata.nyesteBeliggenhedsadresse.kommune.kommuneKode": kommuneKode },
    });
  }

  if (postnummer) {
    filter.push({
      term: { "Vrvirksomhed.virksomhedMetadata.nyesteBeliggenhedsadresse.postnummer": Number(postnummer) },
    });
  }

  return {
    from,
    size,
    _source: SOURCE_FIELDS,
    query: {
      bool: {
        must: must.length ? must : [{ match_all: {} }],
        filter,
        must_not: mustNot,
      },
    },
  };
}

function get(obj, path, fallback = "") {
  try {
    return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj) ?? fallback;
  } catch {
    return fallback;
  }
}

// Kontaktoplysninger (telefon/e-mail) ligger som lister af historiske
// registreringer. Vi vil have den, der er gyldig lige nu (ingen gyldigTil),
// og som ikke er markeret hemmelig. Falder tilbage til den senest opdaterede.
function pickCurrentContact(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const visible = entries.filter((e) => !e.hemmelig);
  if (visible.length === 0) return null;

  const current = visible.find((e) => !e.periode?.gyldigTil);
  if (current) return current.kontaktoplysning;

  const newest = [...visible].sort(
    (a, b) => new Date(b.sidstOpdateret || 0) - new Date(a.sidstOpdateret || 0)
  )[0];
  return newest?.kontaktoplysning || null;
}

function parseHit(hit) {
  const v = hit._source?.Vrvirksomhed;
  if (!v) return null;
  const meta = v.virksomhedMetadata || {};
  const adresse = meta.nyesteBeliggenhedsadresse || {};

  return {
    cvrNummer: v.cvrNummer,
    navn: get(meta, "nyesteNavn.navn", "(intet navn registreret)"),
    branchekode: get(meta, "nyesteHovedbranche.branchekode"),
    branchetekst: get(meta, "nyesteHovedbranche.branchetekst"),
    status: get(meta, "sammensatStatus"),
    vej: adresse.vejnavn ? `${adresse.vejnavn} ${adresse.husnummerFra || ""}`.trim() : "",
    postnummer: adresse.postnummer,
    by: adresse.postdistrikt,
    kommune: get(adresse, "kommune.kommuneNavn"),
    telefon: pickCurrentContact(v.telefonNummer),
    email: pickCurrentContact(v.elektroniskPost),
    reklamebeskyttelse: !!v.reklamebeskyttet,
  };
}

async function searchCvr(params) {
  const body = buildQuery(params);
  let res;
  try {
    res = await fetch(CVR_API_URL, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `Kunne ikke få forbindelse til CVR (${err.message}). Tjek internetforbindelsen på serveren, eller prøv igen om lidt.`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error("CVR afviste login — tjek CVR_USERNAME/CVR_PASSWORD i .env.local.");
    }
    throw new Error(`CVR-opslag fejlede (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const hits = data?.hits?.hits || [];
  const total = data?.hits?.total?.value ?? data?.hits?.total ?? hits.length;

  return {
    total,
    results: hits.map(parseHit).filter(Boolean),
  };
}

module.exports = { searchCvr, SUGGESTED_BRANCHES };

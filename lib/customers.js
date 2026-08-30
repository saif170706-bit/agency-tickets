const { nanoid } = require("nanoid");
const { readDb, mutate } = require("./db");

function nowIso() {
  return new Date().toISOString();
}

function createCustomer({
  cvrNummer = "",
  navn,
  kontaktperson = "",
  telefon = "",
  email = "",
  adresse = "",
  domæne = "",
  hjemmesideØnsker = "",
  farverOgStil = "",
  antalSider = "",
  harLogo = false,
  harBilleder = false,
  noter = "",
}, employee) {
  return mutate((db) => {
    if (!db.customers) db.customers = [];
    const kunde = {
      id: nanoid(),
      cvrNummer: String(cvrNummer || ""),
      navn: navn.trim(),
      kontaktperson: kontaktperson.trim(),
      telefon: telefon.trim(),
      email: email.trim(),
      adresse: adresse.trim(),

      // Salgsattribution
      sælgerId: employee?.id || null,
      sælgerNavn: employee?.name || null,
      konverteretDato: nowIso(),

      // Abonnement — sættes først når salg lukkes (kunden betaler)
      abonnementType: null,   // "basis"|"standard"|"premium"
      abonnementPris: null,   // kr/md som tal
      abonnementStartDato: null,

      // Status
      status: "potentiel",   // "potentiel"|"aktiv"|"inaktiv"

      // Hjemmeside-intake (udfyldt af sælger ved konvertering)
      domæne: domæne.trim(),
      hjemmesideØnsker: hjemmesideØnsker.trim(),
      farverOgStil: farverOgStil.trim(),
      antalSider: antalSider.trim(),
      harLogo: !!harLogo,
      harBilleder: !!harBilleder,
      noter: noter.trim(),

      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.customers.push(kunde);
    return kunde;
  });
}

function listCustomers({ status } = {}) {
  const db = readDb();
  const all = db.customers || [];
  return (status ? all.filter((c) => c.status === status) : all)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getCustomer(id) {
  const db = readDb();
  return (db.customers || []).find((c) => c.id === id) || null;
}

function updateCustomer(id, fields) {
  return mutate((db) => {
    if (!db.customers) db.customers = [];
    const kunde = db.customers.find((c) => c.id === id);
    if (!kunde) throw new Error("Kunde ikke fundet");
    const allowed = [
      "navn","kontaktperson","telefon","email","adresse","domæne",
      "hjemmesideØnsker","farverOgStil","antalSider","harLogo","harBilleder","noter","status",
    ];
    for (const key of allowed) {
      if (fields[key] !== undefined) kunde[key] = fields[key];
    }
    kunde.updatedAt = nowIso();
    return kunde;
  });
}

// Aktivér abonnement = salg lukket = tæller som konverteret salg
function aktiverAbonnement(id, { abonnementType, abonnementPris, abonnementStartDato }) {
  return mutate((db) => {
    if (!db.customers) db.customers = [];
    const kunde = db.customers.find((c) => c.id === id);
    if (!kunde) throw new Error("Kunde ikke fundet");
    if (!abonnementPris || isNaN(Number(abonnementPris))) throw new Error("Ugyldig pris");
    kunde.abonnementType = abonnementType || "basis";
    kunde.abonnementPris = Number(abonnementPris);
    kunde.abonnementStartDato = abonnementStartDato || nowIso();
    kunde.status = "aktiv";
    kunde.updatedAt = nowIso();
    return kunde;
  });
}

// Salgsstatistik per sælger
function salgStats(employeeId = null) {
  const db = readDb();
  const all = db.customers || [];
  const lukkede = all.filter((c) => c.status === "aktiv" && c.abonnementPris);
  const mine = employeeId ? lukkede.filter((c) => c.sælgerId === employeeId) : lukkede;

  function monthsActive(c) {
    if (!c.abonnementStartDato) return 0;
    const ms = Date.now() - new Date(c.abonnementStartDato).getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44)));
  }

  const mrr = mine.reduce((sum, c) => sum + (c.abonnementPris || 0), 0);
  const arr = mrr * 12;
  const totalKunder = mine.length;
  const totalIndbringet = mine.reduce((sum, c) => sum + (c.abonnementPris || 0) * monthsActive(c), 0);

  return { totalKunder, mrr, arr, totalIndbringet, kunder: mine.map((c) => ({ ...c, monthsActive: monthsActive(c) })) };
}

// Leaderboard for alle sælgere (superadmin) — måneds-basis
// Tæller salg lukket (abonnementStartDato) i indeværende måned
function leaderboard() {
  const db = readDb();
  const employees = db.employees || [];
  const customers = db.customers || [];
  const lukkede = customers.filter((c) => c.status === "aktiv" && c.abonnementPris);

  // Indeværende måneds grænser
  const now = new Date();
  const maanedStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const maanedSlut = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const maaned = `${now.toLocaleString("da-DK", { month: "long" })} ${now.getFullYear()}`;

  const denneMaaned = lukkede.filter((c) => {
    const dato = c.abonnementStartDato || c.konverteretDato;
    return dato && dato >= maanedStart && dato < maanedSlut;
  });

  return {
    maaned,
    board: employees.map((emp) => {
      const mine = denneMaaned.filter((c) => c.sælgerId === emp.id);
      const mrr = mine.reduce((sum, c) => sum + (c.abonnementPris || 0), 0);
      return {
        id: emp.id,
        name: emp.name,
        email: emp.email || "",
        rolle: emp.rolle || "medarbejder",
        lukkedeSalg: mine.length,
        mrr,
      };
    }).sort((a, b) => b.lukkedeSalg - a.lukkedeSalg || b.mrr - a.mrr),
  };
}

// Potentielle kunder (ikke aktiveret endnu)
function potentielleKunder(employeeId = null) {
  const db = readDb();
  const all = (db.customers || []).filter((c) => c.status === "potentiel");
  return employeeId ? all.filter((c) => c.sælgerId === employeeId) : all;
}

// Sager (tickets) linket til en kunde
function getCustomerTickets(kundeId) {
  const db = readDb();
  return (db.tickets || [])
    .filter((t) => t.kundeId === kundeId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function deleteCustomer(id) {
  return mutate((db) => {
    if (!db.customers) db.customers = [];
    const idx = db.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Kunde ikke fundet");
    db.customers.splice(idx, 1);
  });
}

function searchCustomers(query) {
  const db = readDb();
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  return (db.customers || [])
    .filter((c) => {
      const haystack = [
        c.navn,
        c.cvrNummer,
        c.kontaktperson,
        c.telefon,
        c.email,
        c.domæne,
        c.adresse,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 8);
}

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  aktiverAbonnement,
  salgStats,
  leaderboard,
  potentielleKunder,
  getCustomerTickets,
  searchCustomers,
};

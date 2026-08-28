const { nanoid } = require("nanoid");
const { readDb, mutate } = require("./db");

const STATUSES = ["Ny", "Kontaktet", "Interesseret", "Afvist", "Konverteret"];

function nowIso() {
  return new Date().toISOString();
}

function listLeads({ status } = {}) {
  const db = readDb();
  const leads = db.leads || [];
  return leads
    .filter((l) => !status || l.status === status)
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

// Alle CVR-numre der allerede er gemt som leads — bruges til at bede CVR om
// IKKE at returnere disse igen, så en ny søgning giver friske virksomheder
// i stedet for at gentjekke de samme hver gang.
function getSavedCvrNumbers() {
  const db = readDb();
  return (db.leads || []).map((l) => l.cvrNummer);
}

// Gemmer en liste af CVR-søgeresultater som leads. Springer dubletter over
// (matcher på cvrNummer), så gentagne søgninger ikke opretter kopier.
function saveLeads(results, employee) {
  return mutate((db) => {
    if (!db.leads) db.leads = [];
    const existing = new Set(db.leads.map((l) => l.cvrNummer));
    let added = 0;
    for (const r of results) {
      if (existing.has(r.cvrNummer)) continue;
      db.leads.push({
        id: nanoid(),
        cvrNummer: r.cvrNummer,
        navn: r.navn,
        branchekode: r.branchekode,
        branchetekst: r.branchetekst,
        vej: r.vej,
        postnummer: r.postnummer,
        by: r.by,
        kommune: r.kommune,
        telefon: r.telefon,
        email: r.email,
        status: "Ny",
        note: r.note || "",
        source: r.source || "manuel",
        savedBy: employee.name,
        savedAt: nowIso(),
        updatedAt: nowIso(),
      });
      existing.add(r.cvrNummer);
      added++;
    }
    return { added, skipped: results.length - added };
  });
}

function updateLead(id, { status, note }, employee) {
  return mutate((db) => {
    const lead = (db.leads || []).find((l) => l.id === id);
    if (!lead) throw new Error("Lead ikke fundet");
    if (status && STATUSES.includes(status)) lead.status = status;
    if (typeof note === "string") lead.note = note;
    lead.updatedAt = nowIso();
    lead.updatedBy = employee.name;
    return lead;
  });
}

function getLead(id) {
  const db = readDb();
  return (db.leads || []).find((l) => l.id === id) || null;
}

function deleteLead(id) {
  return mutate((db) => {
    db.leads = (db.leads || []).filter((l) => l.id !== id);
  });
}

// Opretter en rigtig sag ud fra et lead (bruges når en sælger lukker salget).
function convertLeadToTicket(id, employee) {
  return mutate((db) => {
    const lead = (db.leads || []).find((l) => l.id === id);
    if (!lead) throw new Error("Lead ikke fundet");

    lead.status = "Konverteret";
    lead.updatedAt = nowIso();
    lead.updatedBy = employee.name;

    return lead; // selve ticket-oprettelsen sker uden for mutate() nedenfor
  });
}

module.exports = {
  STATUSES,
  listLeads,
  getSavedCvrNumbers,
  saveLeads,
  updateLead,
  getLead,
  deleteLead,
  convertLeadToTicket,
};

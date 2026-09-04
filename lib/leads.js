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

// Alle CVR-numre vi har set før — leads, virksomheder der venter på
// verifikation, og virksomheder vi har fastslået HAR en hjemmeside. Bruges
// til at bede CVR om IKKE at returnere disse igen, så en ny søgning giver
// friske virksomheder i stedet for at gentjekke de samme hver gang.
function getSavedCvrNumbers() {
  const db = readDb();
  return [
    ...(db.leads || []).map((l) => l.cvrNummer),
    ...(db.leadVerify || []).map((l) => l.cvrNummer),
    ...(db.leadsWithWebsite || []).map((l) => l.cvrNummer),
  ];
}

// --- Verifikationskø -------------------------------------------------------
// Virksomheder hvor det automatiske tjek ikke kunne afgøre noget. De gemmes
// her i stedet for at blive smidt væk (som ville koste os leads) eller talt
// som "uden hjemmeside" (som ville give falske leads). En ekstern kørsel
// afgør dem bagefter og melder svaret tilbage via /api/leads/verify.
function queueForVerification(results) {
  return mutate((db) => {
    if (!db.leadVerify) db.leadVerify = [];
    const known = new Set([
      ...db.leadVerify.map((l) => l.cvrNummer),
      ...(db.leads || []).map((l) => l.cvrNummer),
      ...(db.leadsWithWebsite || []).map((l) => l.cvrNummer),
    ]);
    let queued = 0;
    for (const r of results) {
      if (known.has(r.cvrNummer)) continue;
      db.leadVerify.push({
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
        reason: r.reason || "kunne ikke tjekkes automatisk",
        queuedAt: nowIso(),
      });
      known.add(r.cvrNummer);
      queued++;
    }
    return queued;
  });
}

function listVerificationQueue(limit = 50) {
  const db = readDb();
  return (db.leadVerify || []).slice(0, limit);
}

// Tager svar udefra: {cvrNummer, harHjemmeside, url, sikkerhed}. Kun sikre
// svar bliver til noget — er svaret usikkert, bliver virksomheden liggende
// i køen, så vi hverken taber den eller gætter på den.
function applyVerification(verdicts, savedBy = "automatisk verifikation") {
  return mutate((db) => {
    if (!db.leadVerify) db.leadVerify = [];
    if (!db.leads) db.leads = [];
    if (!db.leadsWithWebsite) db.leadsWithWebsite = [];

    const existingLeads = new Set(db.leads.map((l) => l.cvrNummer));
    let newLeads = 0;
    let hadWebsite = 0;
    let stillUnsure = 0;

    for (const v of verdicts) {
      const cvr = String(v.cvrNummer || "");
      const idx = db.leadVerify.findIndex((l) => l.cvrNummer === cvr);
      if (idx === -1) continue;
      const item = db.leadVerify[idx];

      if (v.sikkerhed === "lav") {
        stillUnsure++;
        continue;
      }

      db.leadVerify.splice(idx, 1);

      if (v.harHjemmeside) {
        db.leadsWithWebsite.push({
          cvrNummer: cvr,
          navn: item.navn,
          url: v.url || null,
          checkedAt: nowIso(),
        });
        hadWebsite++;
      } else if (!existingLeads.has(cvr)) {
        const d = new Date().toLocaleDateString("da-DK");
        db.leads.push({
          ...item,
          id: nanoid(),
          status: "Ny",
          source: "auto (verificeret uden hjemmeside)",
          note: `Verificeret ${d}: ingen egen hjemmeside fundet (sikkerhed: ${v.sikkerhed || "ukendt"})`,
          savedBy,
          savedAt: nowIso(),
          updatedAt: nowIso(),
        });
        existingLeads.add(cvr);
        newLeads++;
      }
    }

    return { newLeads, hadWebsite, stillUnsure, remaining: db.leadVerify.length };
  });
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

function updateLead(id, { status, note, appendNote }, employee) {
  return mutate((db) => {
    const lead = (db.leads || []).find((l) => l.id === id);
    if (!lead) throw new Error("Lead ikke fundet");
    if (status && STATUSES.includes(status)) lead.status = status;
    if (typeof note === "string") lead.note = note;
    // appendNote: prepends a timestamped line to the note log
    if (appendNote) {
      const d = new Date().toLocaleDateString("da-DK", { day: "numeric", month: "short" });
      const line = `[${status || lead.status} — ${d}] ${appendNote}`;
      lead.note = lead.note ? `${line}\n${lead.note}` : line;
    }
    lead.updatedAt = nowIso();
    lead.updatedBy = employee.name;
    return lead;
  });
}

function deleteAllLeads() {
  return mutate((db) => {
    const count = (db.leads || []).length;
    db.leads = [];
    return count;
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
  queueForVerification,
  listVerificationQueue,
  applyVerification,
  updateLead,
  getLead,
  deleteLead,
  deleteAllLeads,
  convertLeadToTicket,
};

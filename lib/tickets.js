const { nanoid } = require("nanoid");
const { readDb, mutate } = require("./db");
const { nextRefNumber } = require("./ref");

const SUPPORT_STATUSES = [
  "Henvendelse modtaget",
  "Arbejde på henvendelse er i gang",
  "Lukket",
];

function nowIso() {
  return new Date().toISOString();
}

function addLog(db, ticketId, employee, text, meta = null) {
  db.logs.push({
    id: nanoid(),
    ticketId,
    employeeId: employee?.id || null,
    employeeName: employee?.name || "System",
    text,
    meta, // fx { type: "status", from: "X", to: "Y" }
    createdAt: nowIso(),
  });
}

function createTicket({ type, title, description, customer, roadmap }, employee) {
  return mutate((db) => {
    const ref = (() => {
      const year = new Date().getFullYear();
      const key = `NS-${year}`;
      const n = (db.seq[key] || 0) + 1;
      db.seq[key] = n;
      return `NS-${year}-${String(n).padStart(4, "0")}`;
    })();

    const ticket = {
      id: nanoid(),
      ref,
      type, // "build" | "support"
      title: title.trim(),
      description: (description || "").trim(),
      customer: {
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        cvr: customer.cvr || "",
      },
      statusLabel: type === "support" ? SUPPORT_STATUSES[0] : (roadmap && roadmap[0]) || "Opstartet",
      isClosed: false,
      closedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      roadmap:
        type === "build"
          ? (roadmap && roadmap.length ? roadmap : ["Opstartet", "I design", "I udvikling", "Klar til gennemsyn", "Live"]).map(
              (label, i) => ({ id: nanoid(), label, done: i === 0 })
            )
          : [],
      currentStepId: null,
    };
    if (type === "build") {
      ticket.currentStepId = ticket.roadmap[0].id;
    }

    db.tickets.push(ticket);
    addLog(db, ticket.id, employee, `Oprettede sagen (${type === "build" ? "nyt hjemmesidebyggeri" : "support-sag"})`);
    return ticket;
  });
}

function listTickets({ archived = false } = {}) {
  const db = readDb();
  return db.tickets
    .filter((t) => !!t.isClosed === !!archived)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getTicketByRef(ref) {
  const db = readDb();
  const ticket = db.tickets.find((t) => t.ref === ref);
  if (!ticket) return null;
  const notes = db.notes
    .filter((n) => n.ticketId === ticket.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const secretNotes = db.secretNotes
    .filter((n) => n.ticketId === ticket.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const logs = db.logs
    .filter((l) => l.ticketId === ticket.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { ticket, notes, secretNotes, logs };
}

function addNote(ref, body, employee) {
  return mutate((db) => {
    const ticket = db.tickets.find((t) => t.ref === ref);
    if (!ticket) throw new Error("Sag ikke fundet");
    const note = {
      id: nanoid(),
      ticketId: ticket.id,
      employeeId: employee.id,
      employeeName: employee.name,
      body,
      createdAt: nowIso(),
    };
    db.notes.push(note);
    addLog(db, ticket.id, employee, `Tilføjede en intern note`);
    ticket.updatedAt = nowIso();
    return note;
  });
}

function addSecretNote(ref, { title, body }, employee) {
  return mutate((db) => {
    const ticket = db.tickets.find((t) => t.ref === ref);
    if (!ticket) throw new Error("Sag ikke fundet");
    const note = {
      id: nanoid(),
      ticketId: ticket.id,
      employeeId: employee.id,
      employeeName: employee.name,
      title: (title || "Hemmelig note").trim(),
      body,
      createdAt: nowIso(),
    };
    db.secretNotes.push(note);
    addLog(db, ticket.id, employee, `Tilføjede en hemmelig note ("${note.title}")`);
    ticket.updatedAt = nowIso();
    return note;
  });
}

function deleteSecretNote(ref, noteId, employee) {
  return mutate((db) => {
    const ticket = db.tickets.find((t) => t.ref === ref);
    if (!ticket) throw new Error("Sag ikke fundet");
    const note = db.secretNotes.find((n) => n.id === noteId && n.ticketId === ticket.id);
    if (!note) throw new Error("Note ikke fundet");
    db.secretNotes = db.secretNotes.filter((n) => n.id !== noteId);
    addLog(db, ticket.id, employee, `Slettede den hemmelige note "${note.title}"`);
    ticket.updatedAt = nowIso();
  });
}

function changeStatus(ref, newStatusLabel, employee) {
  return mutate((db) => {
    const ticket = db.tickets.find((t) => t.ref === ref);
    if (!ticket) throw new Error("Sag ikke fundet");
    const old = ticket.statusLabel;
    ticket.statusLabel = newStatusLabel;
    ticket.updatedAt = nowIso();
    addLog(db, ticket.id, employee, `Ændrede status fra "${old}" til "${newStatusLabel}"`, {
      type: "status",
      from: old,
      to: newStatusLabel,
    });

    if (ticket.type === "support" && newStatusLabel === "Lukket") {
      closeTicketInternal(db, ticket, employee);
    }
    return ticket;
  });
}

function updateRoadmapStep(ref, stepId, employee) {
  return mutate((db) => {
    const ticket = db.tickets.find((t) => t.ref === ref);
    if (!ticket) throw new Error("Sag ikke fundet");
    const step = ticket.roadmap.find((s) => s.id === stepId);
    if (!step) throw new Error("Status-trin ikke fundet");
    const old = ticket.roadmap.find((s) => s.id === ticket.currentStepId);
    ticket.roadmap.forEach((s, i) => {
      s.done = i <= ticket.roadmap.findIndex((x) => x.id === stepId);
    });
    ticket.currentStepId = stepId;
    ticket.statusLabel = step.label;
    ticket.updatedAt = nowIso();
    addLog(
      db,
      ticket.id,
      employee,
      `Ændrede status fra "${old ? old.label : "—"}" til "${step.label}"`,
      { type: "status", from: old ? old.label : "—", to: step.label }
    );
    return ticket;
  });
}

function addRoadmapStep(ref, label, employee) {
  return mutate((db) => {
    const ticket = db.tickets.find((t) => t.ref === ref);
    if (!ticket) throw new Error("Sag ikke fundet");
    ticket.roadmap.push({ id: nanoid(), label, done: false });
    ticket.updatedAt = nowIso();
    addLog(db, ticket.id, employee, `Tilføjede status-trin "${label}"`);
    return ticket;
  });
}

function closeTicketInternal(db, ticket, employee) {
  if (ticket.isClosed) return;
  ticket.isClosed = true;
  ticket.closedAt = nowIso();
  const removed = db.secretNotes.filter((n) => n.ticketId === ticket.id).length;
  db.secretNotes = db.secretNotes.filter((n) => n.ticketId !== ticket.id);
  addLog(
    db,
    ticket.id,
    employee,
    `Lukkede sagen${removed ? ` (${removed} hemmelig(e) note(r) blev automatisk slettet)` : ""}`
  );
}

function closeTicket(ref, employee) {
  return mutate((db) => {
    const ticket = db.tickets.find((t) => t.ref === ref);
    if (!ticket) throw new Error("Sag ikke fundet");
    if (ticket.type === "support") ticket.statusLabel = "Lukket";
    closeTicketInternal(db, ticket, employee);
    return ticket;
  });
}

function reopenTicket(ref, employee) {
  return mutate((db) => {
    const ticket = db.tickets.find((t) => t.ref === ref);
    if (!ticket) throw new Error("Sag ikke fundet");
    ticket.isClosed = false;
    ticket.closedAt = null;
    if (ticket.type === "support") ticket.statusLabel = "Arbejde på henvendelse er i gang";
    ticket.updatedAt = nowIso();
    addLog(db, ticket.id, employee, `Genåbnede sagen`);
    return ticket;
  });
}

function searchTickets(query) {
  const db = readDb();
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  return db.tickets
    .filter((t) => {
      const haystack = [
        t.ref,
        t.title,
        t.customer.name,
        t.customer.phone,
        t.customer.email,
        t.customer.cvr,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 30);
}

function dashboardStats() {
  const db = readDb();
  const active = db.tickets.filter((t) => !t.isClosed);
  const closed = db.tickets.filter((t) => t.isClosed);

  const byStatus = {};
  for (const t of active) {
    byStatus[t.statusLabel] = (byStatus[t.statusLabel] || 0) + 1;
  }
  const statusCards = Object.entries(byStatus)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalActive: active.length,
    totalClosed: closed.length,
    totalBuild: active.filter((t) => t.type === "build").length,
    totalSupport: active.filter((t) => t.type === "support").length,
    statusCards,
  };
}

module.exports = {
  SUPPORT_STATUSES,
  createTicket,
  listTickets,
  getTicketByRef,
  searchTickets,
  dashboardStats,
  addNote,
  addSecretNote,
  deleteSecretNote,
  changeStatus,
  updateRoadmapStep,
  addRoadmapStep,
  closeTicket,
  reopenTicket,
};

const { nanoid } = require("nanoid");
const { readDb, mutate } = require("./db");

function nowIso() {
  return new Date().toISOString();
}

// Standard fornyelsesperiode er 1 år — kan altid rettes manuelt pr. domæne.
function addOneYear(dateStr) {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function listAllDomains() {
  const db = readDb();
  const tickets = db.tickets || [];
  return (db.domains || [])
    .map((d) => {
      const ticket = tickets.find((t) => t.id === d.ticketId);
      return { ...d, ticketRef: ticket?.ref, ticketTitle: ticket?.title, customerName: ticket?.customer?.name };
    })
    .sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate));
}

function listDomainsForTicket(ticketId) {
  const db = readDb();
  return (db.domains || [])
    .filter((d) => d.ticketId === ticketId)
    .sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate));
}

function addDomain(ticketRef, data, employee) {
  return mutate((db) => {
    const ticket = db.tickets.find((t) => t.ref === ticketRef);
    if (!ticket) throw new Error("Sag ikke fundet");
    if (!db.domains) db.domains = [];

    const registeredAt = data.registeredAt || nowIso().slice(0, 10);
    const domain = {
      id: nanoid(),
      ticketId: ticket.id,
      domainName: data.domainName.trim().toLowerCase(),
      registrar: data.registrar || "HurraDNS",
      registeredToName: data.registeredToName || ticket.customer?.name || "",
      registeredToCvr: data.registeredToCvr || ticket.customer?.cvr || "",
      registeredAt,
      renewalDate: data.renewalDate || addOneYear(registeredAt),
      costPrice: Number(data.costPrice) || 0,
      customerPrice: Number(data.customerPrice) || 0,
      status: "Aktiv",
      note: data.note || "",
      createdBy: employee.name,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.domains.push(domain);

    if (!db.logs) db.logs = [];
    db.logs.push({
      id: nanoid(),
      ticketId: ticket.id,
      employeeId: employee.id,
      employeeName: employee.name,
      text: `Tilføjede domænet "${domain.domainName}" (fornyes ${domain.renewalDate})`,
      meta: null,
      createdAt: nowIso(),
    });
    ticket.updatedAt = nowIso();

    return domain;
  });
}

function updateDomain(id, data, employee) {
  return mutate((db) => {
    const domain = (db.domains || []).find((d) => d.id === id);
    if (!domain) throw new Error("Domæne ikke fundet");
    const fields = ["domainName", "registrar", "registeredToName", "registeredToCvr", "registeredAt", "renewalDate", "costPrice", "customerPrice", "status", "note"];
    for (const f of fields) {
      if (data[f] !== undefined) domain[f] = f === "costPrice" || f === "customerPrice" ? Number(data[f]) : data[f];
    }
    domain.updatedAt = nowIso();

    const ticket = db.tickets.find((t) => t.id === domain.ticketId);
    if (ticket) {
      if (!db.logs) db.logs = [];
      db.logs.push({
        id: nanoid(),
        ticketId: ticket.id,
        employeeId: employee.id,
        employeeName: employee.name,
        text: `Opdaterede domænet "${domain.domainName}"`,
        meta: null,
        createdAt: nowIso(),
      });
      ticket.updatedAt = nowIso();
    }
    return domain;
  });
}

function deleteDomain(id, employee) {
  return mutate((db) => {
    const domain = (db.domains || []).find((d) => d.id === id);
    if (!domain) throw new Error("Domæne ikke fundet");
    db.domains = db.domains.filter((d) => d.id !== id);

    const ticket = db.tickets.find((t) => t.id === domain.ticketId);
    if (ticket) {
      if (!db.logs) db.logs = [];
      db.logs.push({
        id: nanoid(),
        ticketId: ticket.id,
        employeeId: employee.id,
        employeeName: employee.name,
        text: `Fjernede domænet "${domain.domainName}"`,
        meta: null,
        createdAt: nowIso(),
      });
      ticket.updatedAt = nowIso();
    }
  });
}

module.exports = { listAllDomains, listDomainsForTicket, addDomain, updateDomain, deleteDomain };

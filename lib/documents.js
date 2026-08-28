const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");
const { readDb, mutate } = require("./db");

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

async function saveDocument(ref, file, employee) {
  const db = readDb();
  const ticket = db.tickets.find((t) => t.ref === ref);
  if (!ticket) throw new Error("Sag ikke fundet");

  const id = nanoid();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${id}-${safeName}`;
  const ticketDir = path.join(UPLOAD_DIR, ticket.id);
  ensureDir(ticketDir);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(ticketDir, storedName), buffer);

  return mutate((db2) => {
    if (!db2.documents) db2.documents = [];
    const doc = {
      id,
      ticketId: ticket.id,
      storedName,
      originalName: file.name,
      size: buffer.length,
      contentType: file.type || "application/octet-stream",
      uploadedBy: employee.name,
      uploadedAt: nowIso(),
    };
    db2.documents.push(doc);
    const t2 = db2.tickets.find((t) => t.id === ticket.id);
    t2.updatedAt = nowIso();
    if (!db2.logs) db2.logs = [];
    db2.logs.push({
      id: nanoid(),
      ticketId: ticket.id,
      employeeId: employee.id,
      employeeName: employee.name,
      text: `Uploadede dokumentet "${file.name}"`,
      meta: null,
      createdAt: nowIso(),
    });
    return doc;
  });
}

function listDocuments(ticketId) {
  const db = readDb();
  return (db.documents || [])
    .filter((d) => d.ticketId === ticketId)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

function getDocument(ref, docId) {
  const db = readDb();
  const ticket = db.tickets.find((t) => t.ref === ref);
  if (!ticket) return null;
  const doc = (db.documents || []).find((d) => d.id === docId && d.ticketId === ticket.id);
  if (!doc) return null;
  const filePath = path.join(UPLOAD_DIR, ticket.id, doc.storedName);
  if (!fs.existsSync(filePath)) return null;
  return { doc, filePath };
}

function deleteDocument(ref, docId, employee) {
  return mutate((db) => {
    const ticket = db.tickets.find((t) => t.ref === ref);
    if (!ticket) throw new Error("Sag ikke fundet");
    const doc = (db.documents || []).find((d) => d.id === docId && d.ticketId === ticket.id);
    if (!doc) throw new Error("Dokument ikke fundet");
    const filePath = path.join(UPLOAD_DIR, ticket.id, doc.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.documents = db.documents.filter((d) => d.id !== docId);
    ticket.updatedAt = nowIso();
    if (!db.logs) db.logs = [];
    db.logs.push({
      id: nanoid(),
      ticketId: ticket.id,
      employeeId: employee.id,
      employeeName: employee.name,
      text: `Slettede dokumentet "${doc.originalName}"`,
      meta: null,
      createdAt: nowIso(),
    });
  });
}

module.exports = { saveDocument, listDocuments, getDocument, deleteDocument };

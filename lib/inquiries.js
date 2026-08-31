const { nanoid } = require("nanoid");
const { readDb, mutate } = require("./db");

/**
 * Opret ny henvendelse (fra kontaktformular på buildone.dk)
 */
function createInquiry({ navn, email, telefon, besked, kilde = "buildone.dk" }) {
  return mutate((db) => {
    if (!db.inquiries) db.inquiries = [];
    const inquiry = {
      id: nanoid(),
      navn: (navn || "").trim(),
      email: (email || "").trim(),
      telefon: (telefon || "").trim(),
      besked: (besked || "").trim(),
      kilde,
      status: "ny",
      createdAt: new Date().toISOString(),
    };
    db.inquiries.push(inquiry);
    return inquiry;
  });
}

/**
 * Hent alle henvendelser, nyeste først
 */
function listInquiries() {
  const db = readDb();
  const inquiries = db.inquiries || [];
  return [...inquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Opdater status på en henvendelse
 * status: "ny" | "set" | "arkiveret"
 */
function updateInquiryStatus(id, status) {
  return mutate((db) => {
    if (!db.inquiries) db.inquiries = [];
    const idx = db.inquiries.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Henvendelse ikke fundet");
    db.inquiries[idx].status = status;
    db.inquiries[idx].updatedAt = new Date().toISOString();
    return db.inquiries[idx];
  });
}

/**
 * Antal ulæste ("ny") henvendelser
 */
function countNew() {
  const db = readDb();
  const inquiries = db.inquiries || [];
  return inquiries.filter((i) => i.status === "ny").length;
}

module.exports = { createInquiry, listInquiries, updateInquiryStatus, countNew };

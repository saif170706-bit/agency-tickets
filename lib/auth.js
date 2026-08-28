const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { readDb } = require("./db");

const SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret";
const COOKIE_NAME = "nordlys_session";

function sign(value) {
  const h = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  return `${value}.${h}`;
}

function unsign(signed) {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function makeSessionCookie(employeeId) {
  return sign(employeeId);
}

function employeeIdFromCookie(cookieValue) {
  return unsign(cookieValue);
}

function getEmployeeById(id) {
  const db = readDb();
  return db.employees.find((e) => e.id === id) || null;
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  makeSessionCookie,
  employeeIdFromCookie,
  getEmployeeById,
};

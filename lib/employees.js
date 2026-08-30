const { nanoid } = require("nanoid");
const { readDb, mutate } = require("./db");

function getEmployeeByEmail(email) {
  const db = readDb();
  return db.employees.find((e) => e.email && e.email.toLowerCase() === email.toLowerCase()) || null;
}

function getEmployeeById(id) {
  const db = readDb();
  return db.employees.find((e) => e.id === id) || null;
}

// passwordHash: null = første-login, bruger skal sætte kode selv
// Ingen brugernavn — email er unik identifikator, navn vises i UI
function createEmployee({ name, email, passwordHash = null, rolle = "medarbejder" }) {
  return mutate((db) => {
    if (!email || !email.trim()) throw new Error("E-mail er påkrævet");
    if (db.employees.some((e) => e.email && e.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new Error("En bruger med den e-mail findes allerede");
    }
    const employee = { id: nanoid(), name: name.trim(), email: email.trim(), passwordHash, rolle };
    db.employees.push(employee);
    return employee;
  });
}

function updateEmployee(id, fields) {
  return mutate((db) => {
    const emp = db.employees.find((e) => e.id === id);
    if (!emp) throw new Error("Medarbejder ikke fundet");
    if (fields.name !== undefined) emp.name = fields.name;
    if (fields.email !== undefined) emp.email = (fields.email || "").trim();
    if (fields.passwordHash !== undefined) emp.passwordHash = fields.passwordHash;
    if (fields.rolle !== undefined) emp.rolle = fields.rolle;
    return emp;
  });
}

// Sæt adgangskode — bruges ved første-login og nulstilling
function setEmployeePassword(id, passwordHash) {
  return mutate((db) => {
    const emp = db.employees.find((e) => e.id === id);
    if (!emp) throw new Error("Medarbejder ikke fundet");
    emp.passwordHash = passwordHash;
    return emp;
  });
}

// Nulstil adgangskode (superadmin) — tvinger brugeren til at sætte ny kode ved næste login
function resetEmployeePassword(id) {
  return mutate((db) => {
    const emp = db.employees.find((e) => e.id === id);
    if (!emp) throw new Error("Medarbejder ikke fundet");
    emp.passwordHash = null;
    return emp;
  });
}

function deleteEmployee(id) {
  return mutate((db) => {
    const idx = db.employees.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Medarbejder ikke fundet");
    db.employees.splice(idx, 1);
  });
}

function listEmployees() {
  const db = readDb();
  return db.employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email || "",
    rolle: e.rolle || "medarbejder",
    hasPassword: !!e.passwordHash,
  }));
}

function isSuperadmin(employee) {
  return employee && employee.rolle === "superadmin";
}

module.exports = {
  getEmployeeByEmail,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  setEmployeePassword,
  resetEmployeePassword,
  deleteEmployee,
  listEmployees,
  isSuperadmin,
};

const { nanoid } = require("nanoid");
const { readDb, mutate } = require("./db");

function getEmployeeByUsername(username) {
  const db = readDb();
  return db.employees.find((e) => e.username.toLowerCase() === username.toLowerCase()) || null;
}

function createEmployee({ name, username, passwordHash }) {
  return mutate((db) => {
    if (db.employees.some((e) => e.username.toLowerCase() === username.toLowerCase())) {
      throw new Error("Brugernavn findes allerede");
    }
    const employee = { id: nanoid(), name, username, passwordHash };
    db.employees.push(employee);
    return employee;
  });
}

function listEmployees() {
  const db = readDb();
  return db.employees.map((e) => ({ id: e.id, name: e.name, username: e.username }));
}

module.exports = { getEmployeeByUsername, createEmployee, listEmployees };

// Opret den første medarbejder ud fra .env.local (SEED_NAME/SEED_USERNAME/SEED_PASSWORD).
// Kør med: npm run seed
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const { createEmployee, getEmployeeByUsername } = require("../lib/employees");
const { mutate } = require("../lib/db");

async function main() {
  const name = process.env.SEED_NAME || "Admin";
  const username = process.env.SEED_USERNAME || "admin";
  const password = process.env.SEED_PASSWORD || "skift-mig";

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = getEmployeeByUsername(username);

  if (existing) {
    mutate((db) => {
      const emp = db.employees.find((e) => e.id === existing.id);
      emp.name = name;
      emp.passwordHash = passwordHash;
    });
    console.log(`Opdaterede medarbejder "${username}" med nyt navn/adgangskode.`);
  } else {
    createEmployee({ name, username, passwordHash });
    console.log(`Oprettede medarbejder "${username}".`);
  }
  console.log(`Login med brugernavn: ${username}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

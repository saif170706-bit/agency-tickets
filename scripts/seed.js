// Opret den første medarbejder ud fra .env.local (SEED_NAME/SEED_EMAIL/SEED_PASSWORD).
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

const { createEmployee, getEmployeeByEmail, updateEmployee } = require("../lib/employees");

async function main() {
  const name = process.env.SEED_NAME || "Saif Aldin";
  const email = process.env.SEED_EMAIL || "Saifaldin@buildone.dk";
  const password = process.env.SEED_PASSWORD || null; // null = første-login

  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  const existing = getEmployeeByEmail(email);

  if (existing) {
    updateEmployee(existing.id, {
      name,
      email,
      rolle: "superadmin",
      ...(passwordHash !== null ? { passwordHash } : {}),
    });
    console.log(`Opdaterede medarbejder "${email}" (superadmin).`);
  } else {
    createEmployee({ name, email, passwordHash, rolle: "superadmin" });
    console.log(`Oprettede medarbejder "${email}" som superadmin.`);
  }

  if (!passwordHash) {
    console.log(`Første-login: gå til /login og log ind med e-mail "${email}" (lad password-feltet stå tomt).`);
  } else {
    console.log(`Login med e-mail: ${email}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

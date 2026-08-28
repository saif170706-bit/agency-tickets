// Simpel fil-baseret database (JSON). Ingen native afhængigheder,
// så den virker overalt uden ekstra build-værktøjer.
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY_DB = {
  employees: [],
  tickets: [],
  notes: [],
  secretNotes: [],
  logs: [],
  seq: {},
};

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2), "utf8");
  }
}

function readDb() {
  ensureFile();
  const raw = fs.readFileSync(DB_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return { ...EMPTY_DB };
  }
}

// Meget simpel skrive-kø, så vi ikke overskriver hinandens ændringer
// ved to hurtige requests efter hinanden.
let writeChain = Promise.resolve();

function writeDb(db) {
  writeChain = writeChain.then(
    () =>
      new Promise((resolve, reject) => {
        fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8", (err) => {
          if (err) reject(err);
          else resolve();
        });
      })
  );
  return writeChain;
}

// Udfør en "transaktion": læs, muter, skriv. Synkront læst/muteret for
// at undgå race conditions mellem flere samtidige mutationer.
function mutate(fn) {
  const db = readDb();
  const result = fn(db);
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  return result;
}

module.exports = { readDb, writeDb, mutate };

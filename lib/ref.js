const { mutate } = require("./db");

// Genererer et unikt, fortløbende sagsnummer pr. år, fx NS-2026-0001
function nextRefNumber(prefix = "NS") {
  const year = new Date().getFullYear();
  return mutate((db) => {
    if (!db.seq) db.seq = {};
    const key = `${prefix}-${year}`;
    const n = (db.seq[key] || 0) + 1;
    db.seq[key] = n;
    return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
  });
}

module.exports = { nextRefNumber };

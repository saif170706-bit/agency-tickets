#!/bin/sh
set -e

# Railway mounter en persistent Volume på /app/data
# Første gang volumet er tomt → seed database med superadmin-bruger
if [ ! -f "data/db.json" ]; then
  echo "[startup] Ingen database fundet — opretter og seeder..."
  node scripts/seed.js
  echo "[startup] Database oprettet."
else
  echo "[startup] Database eksisterer allerede — springer seed over."
fi

echo "[startup] Starter Next.js på port ${PORT:-3000}..."
exec npm run start

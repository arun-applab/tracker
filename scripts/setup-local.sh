#!/usr/bin/env bash
# One-time local setup on a Mac: Postgres database + .env + tables + sample team.
# Needs Node 20+ and Postgres.app (https://postgresapp.com) running.
# Usage (from the project folder):  bash scripts/setup-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DB_NAME="${DB_NAME:-design_tracker}"
PG_BIN="/Applications/Postgres.app/Contents/Versions/latest/bin"
[ -d "$PG_BIN" ] && export PATH="$PG_BIN:$PATH"

command -v node >/dev/null || { echo "✗ Node.js is not installed — get it from https://nodejs.org (LTS)."; exit 1; }
command -v psql >/dev/null || { echo "✗ Postgres not found — install Postgres.app from https://postgresapp.com, open it and click Initialize/Start."; exit 1; }
pg_isready -q -h localhost -p 5432 || { echo "✗ Postgres isn't running — open Postgres.app and click Start."; exit 1; }

echo "→ Creating database \"$DB_NAME\" (skipped if it exists)"
createdb -h localhost "$DB_NAME" 2>/dev/null || true

URL="postgresql://localhost:5432/$DB_NAME"
if [ -f .env ]; then
  cp .env .env.backup
  echo "→ Backed up your old .env to .env.backup"
fi
SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')
cat > .env <<ENV
DATABASE_URL="$URL"
NEXTAUTH_SECRET="$SECRET"
NEXTAUTH_URL="http://localhost:3000"
APP_TIMEZONE="Asia/Qatar"
ENV
echo "→ Wrote .env (DATABASE_URL=$URL)"

echo "→ Installing packages"
npm install

echo "→ Creating tables"
npx prisma migrate deploy

if [ "${SKIP_SEED:-}" != "1" ]; then
  echo "→ Loading the Applab team and sample projects"
  npm run db:seed
fi

echo
echo "✓ Done. Start the app with:  npm run dev"
echo "  Then open http://localhost:3000 and sign in as prasun@applab.qa / Password123!"

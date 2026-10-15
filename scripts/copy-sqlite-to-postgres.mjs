#!/usr/bin/env node
/**
 * One-off copy of all data from the local SQLite database (dev.db) into PostgreSQL
 * (e.g. Railway). Run it AFTER the Postgres tables exist (`prisma migrate deploy`).
 *
 *   DATABASE_URL="<Railway DATABASE_PUBLIC_URL>" node scripts/copy-sqlite-to-postgres.mjs ./dev.db
 *
 * - Refuses to run if the Postgres database already has users (add --force to wipe and re-copy).
 * - Everything is copied in one transaction: it either all lands or nothing does.
 */
import Database from "better-sqlite3";
import pg from "pg";

const file = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? "./dev.db";
const force = process.argv.includes("--force");
const url = process.env.DATABASE_URL;
if (!url || !/^postgres(ql)?:\/\//.test(url)) {
  console.error("Set DATABASE_URL to your PostgreSQL connection string (Railway: DATABASE_PUBLIC_URL).");
  process.exit(1);
}

// Tables in foreign-key order. Self-references on User are filled in a second pass.
const TABLES = [
  "User",
  "Skill",
  "UserSkill",
  "Project",
  "ProjectManager",
  "ProjectAssignment",
  "ProjectStatusChange",
  "ProjectLink",
  "TimeLog",
  "TimeLogComment",
  "Suggestion",
  "SuggestionReply",
  "SuggestionRead",
];
const USER_SELF_REFS = ["managerId", "availabilityOverrideById"];

const sqlite = new Database(file, { readonly: true, fileMustExist: true });
const client = new pg.Client({ connectionString: url });
await client.connect();

const q = (name) => `"${name.replace(/"/g, '""')}"`;

async function pgColumns(table) {
  const r = await client.query(
    `select column_name, data_type from information_schema.columns where table_schema = current_schema() and table_name = $1`,
    [table],
  );
  if (!r.rows.length) throw new Error(`Table "${table}" not found in Postgres — run "npx prisma migrate deploy" first.`);
  return new Map(r.rows.map((c) => [c.column_name, c.data_type]));
}

function convert(value, type, column) {
  if (value === null || value === undefined) return null;
  // The "Team Member" role was renamed to "Mid Designer".
  if (column === "role" && value === "TEAM_MEMBER") return "MID_DESIGNER";
  if (type === "boolean") return value === 1 || value === true || value === "1" || value === "true";
  if (type.startsWith("timestamp")) {
    const d = typeof value === "number" ? new Date(value) : new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) throw new Error(`Bad date value: ${value}`);
    // Prisma stores UTC in "timestamp without time zone": send the UTC wall-clock time.
    return d.toISOString().replace("T", " ").replace("Z", "");
  }
  return value;
}

try {
  const existing = await client.query(`select count(*)::int as n from ${q("User")}`);
  if (existing.rows[0].n > 0 && !force) {
    console.error(`Postgres already has ${existing.rows[0].n} users. Re-run with --force to wipe it and copy again.`);
    process.exit(1);
  }

  await client.query("BEGIN");
  if (force) {
    for (const t of [...TABLES].reverse()) await client.query(`DELETE FROM ${q(t)}`);
  }

  const counts = {};
  const userRefs = [];
  for (const table of TABLES) {
    const cols = await pgColumns(table);
    const rows = sqlite.prepare(`SELECT * FROM ${q(table)}`).all();
    if (!rows.length) {
      counts[table] = 0;
      continue;
    }
    const names = Object.keys(rows[0]).filter((c) => cols.has(c));
    const insertNames = table === "User" ? names.filter((c) => !USER_SELF_REFS.includes(c)) : names;
    const placeholders = insertNames.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${q(table)} (${insertNames.map(q).join(", ")}) VALUES (${placeholders})`;
    for (const row of rows) {
      await client.query(sql, insertNames.map((c) => convert(row[c], cols.get(c), c)));
      if (table === "User") userRefs.push(row);
    }
    counts[table] = rows.length;
  }

  // Second pass: User → manager / availability-set-by references.
  for (const row of userRefs) {
    const sets = USER_SELF_REFS.filter((c) => row[c] != null);
    if (!sets.length) continue;
    await client.query(
      `UPDATE ${q("User")} SET ${sets.map((c, i) => `${q(c)} = $${i + 1}`).join(", ")} WHERE "id" = $${sets.length + 1}`,
      [...sets.map((c) => row[c]), row.id],
    );
  }

  await client.query("COMMIT");
  console.log("Copied:", counts);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Copy failed, nothing was written:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
  sqlite.close();
}

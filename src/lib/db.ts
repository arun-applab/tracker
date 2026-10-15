import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 talks to the database through a driver adapter.
 * SQLite (file:...) → better-sqlite3, PostgreSQL (postgres://...) → pg.
 * Switching databases only needs the schema `provider` + DATABASE_URL changed.
 */
function createClient() {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  if (url.startsWith("file:")) {
    // The schema targets PostgreSQL now; the old dev.db can only be read by scripts/copy-sqlite-to-postgres.mjs.
    throw new Error(
      `DATABASE_URL points at a SQLite file (${url}), but the app now uses PostgreSQL. ` +
        `Set DATABASE_URL in .env to a Postgres connection string (see README → Setup).`,
    );
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

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
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter =
    url.startsWith("postgres://") || url.startsWith("postgresql://")
      ? new PrismaPg({ connectionString: url })
      : new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

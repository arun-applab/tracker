import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL is only needed for commands that touch the database (migrate, seed).
// `prisma generate` (run on npm install / during builds) works without it.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  ...(url ? { datasource: { url } } : {}),
});

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / driver packages must not be bundled by webpack.
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;

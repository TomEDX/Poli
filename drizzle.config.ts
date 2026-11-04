import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

if (existsSync(".env")) process.loadEnvFile(".env");

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/*/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url },
});

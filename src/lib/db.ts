import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

// Reuse one connection pool across Next.js hot reloads in development.
const globalForDb = globalThis as unknown as { dbClient?: postgres.Sql };
const client = globalForDb.dbClient ?? postgres(url, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.dbClient = client;

export const db = drizzle(client, { casing: "snake_case" });

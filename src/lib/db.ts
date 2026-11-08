import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

// Supabase's session pooler (port 5432) gives each open connection one of 15 slots for as
// long as it stays open: warm Vercel functions plus a build run out of them, and queries
// then hang or are refused. The transaction pooler (6543) frees the slot after each query.
if (process.env.VERCEL && isSupabaseSessionPooler(url)) {
  throw new Error("On Vercel, DATABASE_URL must be Supabase's transaction pooler (port 6543), not its session pooler (5432).");
}

// Reuse one connection pool across Next.js hot reloads in development.
const globalForDb = globalThis as unknown as { dbClient?: postgres.Sql };
// Few connections, closed after 20 s idle, so a warm function does not keep them for nothing.
const client = globalForDb.dbClient ?? postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
if (process.env.NODE_ENV !== "production") globalForDb.dbClient = client;

export const db = drizzle(client, { casing: "snake_case" });

function isSupabaseSessionPooler(databaseUrl: string): boolean {
  const { hostname, port } = new URL(databaseUrl);
  return hostname.endsWith(".pooler.supabase.com") && (port === "" || port === "5432");
}

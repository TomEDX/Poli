import { sql } from "drizzle-orm";
import { beforeEach } from "vitest";

import { db } from "@/lib/db";

// Inserted by the migrations and never written by the app, so it outlives every test.
const tablesFilledByMigrations = new Set(["public.legislatures"]);

beforeEach(async () => {
  const rows = await db.execute<{ name: string }>(
    sql`select format('%I.%I', schemaname, tablename) as name from pg_tables where schemaname = 'public'`,
  );
  const tables = rows.filter((table) => !tablesFilledByMigrations.has(table.name));
  if (tables.length === 0) return;
  await db.execute(
    sql.raw(`truncate ${tables.map((table) => table.name).join(", ")} restart identity cascade`),
  );
});

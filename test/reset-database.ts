import { sql } from "drizzle-orm";
import { beforeEach } from "vitest";

import { db } from "@/lib/db";

beforeEach(async () => {
  const tables = await db.execute<{ name: string }>(
    sql`select format('%I.%I', schemaname, tablename) as name from pg_tables where schemaname = 'public'`,
  );
  if (tables.length === 0) return;
  await db.execute(
    sql.raw(`truncate ${tables.map((table) => table.name).join(", ")} restart identity cascade`),
  );
});

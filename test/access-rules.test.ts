import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { topics } from "@/modules/reference/schema";

// The roles Supabase gives to a client that is not signed in (anon) or signed
// in through Supabase Auth (authenticated). The app itself connects as postgres.
const clientRoles = ["anon", "authenticated"] as const;

async function publicTables() {
  const rows = await db.execute<{ name: string }>(
    sql`select tablename as name from pg_tables where schemaname = 'public' order by tablename`,
  );
  return rows.map((row) => row.name);
}

async function asRole(role: string, statement: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw(`set local role ${role}`));
    return tx.execute(sql.raw(statement));
  });
}

async function errorCode(promise: Promise<unknown>) {
  try {
    await promise;
    return "succeeded";
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return cause?.code ?? (error as { code?: string }).code;
  }
}

const insufficientPrivilege = "42501";

describe("database access rules", () => {
  it("protects every public table with row level security and no write policy", async () => {
    const unprotected = await db.execute<{ name: string }>(
      sql`select relname as name from pg_class
          where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
    );
    const writePolicies = await db.execute<{ name: string }>(
      sql`select tablename || '.' || policyname as name from pg_policies
          where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')`,
    );

    expect(unprotected.map((row) => row.name)).toEqual([]);
    expect(writePolicies.map((row) => row.name)).toEqual([]);
  });

  it("refuses inserts and truncates from clients on every public table", async () => {
    const tables = await publicTables();
    expect(tables).toContain("editors");

    for (const table of tables) {
      for (const role of clientRoles) {
        expect(
          await errorCode(asRole(role, `insert into public."${table}" default values`)),
          `insert into ${table} as ${role}`,
        ).toBe(insufficientPrivilege);
        expect(
          await errorCode(asRole(role, `truncate public."${table}"`)),
          `truncate ${table} as ${role}`,
        ).toBe(insufficientPrivilege);
      }
    }
  });

  it("leaves existing rows untouched by client updates and deletes", async () => {
    await db.insert(topics).values({ name: "Santé", slug: "sante", position: 1 });
    await db.execute(sql`insert into editors (email) values ('editeur@example.fr')`);

    for (const role of clientRoles) {
      for (const table of ["topics", "editors"]) {
        await errorCode(asRole(role, `update public."${table}" set created_at = now() - interval '1 day'`));
        await errorCode(asRole(role, `delete from public."${table}"`));
      }
    }

    const rows = await db.execute<{ topics: number; editors: number; changed: number }>(
      sql`select (select count(*) from topics)::int as topics,
                 (select count(*) from editors)::int as editors,
                 (select count(*) from topics where created_at < now() - interval '1 hour')::int as changed`,
    );
    expect(rows[0]).toEqual({ topics: 1, editors: 1, changed: 0 });
  });
});

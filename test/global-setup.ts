import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { TEST_DATABASE_URL } from "./database-url";

const connect = (url: string) => postgres(url, { max: 1, onnotice: () => {} });

export default async function createTestDatabase() {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);
  // The database is dropped on every run: refuse anything that is not clearly a test database.
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to recreate "${name}": the test database name must end with _test.`);
  }

  url.pathname = "/postgres";
  const maintenance = connect(url.toString());
  await maintenance`drop database if exists ${maintenance(name)} with (force)`;
  await maintenance`create database ${maintenance(name)}`;
  await maintenance.end();

  const client = connect(TEST_DATABASE_URL);
  // A fresh database lacks the grants Supabase gives its API roles on every
  // project; recreate them so access rules are tested as they run in Supabase.
  await client.unsafe(`
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
}

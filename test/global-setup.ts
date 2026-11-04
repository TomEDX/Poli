import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { TEST_DATABASE_URL } from "./database-url";

export default async function createTestDatabase() {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);
  // The database is dropped on every run: refuse anything that is not clearly a test database.
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to recreate "${name}": the test database name must end with _test.`);
  }

  url.pathname = "/postgres";
  const admin = postgres(url.toString(), { max: 1, onnotice: () => {} });
  await admin`drop database if exists ${admin(name)} with (force)`;
  await admin`create database ${admin(name)}`;
  await admin.end();

  const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
}

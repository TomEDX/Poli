import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

import postgres from "postgres";

import { BASE_REF, REPO_ROOT } from "./config.ts";
import type { Job } from "./state.ts";
import { Refusal, runOrRefuse } from "./shell.ts";

export type JobDatabases = Job["databases"];

const LOCAL_HOSTS = ["127.0.0.1", "localhost"];

// Names are plain identifiers, so they need no quoting in SQL. The test one must end with _test:
// the test setup drops and recreates it on every run.
export function databaseNames(issue: number): JobDatabases {
  return { dev: `poli_job${issue}_dev`, test: `poli_job${issue}_test` };
}

export function jobEnvironment(job: Pick<Job, "databases" | "port">): Record<string, string> {
  return {
    DATABASE_URL: databaseUrl(job.databases.dev),
    TEST_DATABASE_URL: databaseUrl(job.databases.test),
    PORT: String(job.port ?? ""),
    FACTORY_BASE_REF: BASE_REF,
  };
}

// The development database gets the migrations and the seed of the job's own worktree.
export async function prepareDevDatabase(job: Job): Promise<void> {
  const env = { ...process.env, ...jobEnvironment(job) };
  await withMaintenanceClient(async (client) => {
    const existing = await client`select 1 from pg_database where datname = ${job.databases.dev}`;
    if (existing.length === 0) await client`create database ${client(job.databases.dev)}`;
  });
  runOrRefuse("pnpm", ["exec", "drizzle-kit", "migrate"], { cwd: job.worktree, env });
  runOrRefuse("node", ["scripts/seed-local.ts"], { cwd: job.worktree, env });
}

export async function dropJobDatabases(databases: JobDatabases): Promise<void> {
  await withMaintenanceClient(async (client) => {
    for (const name of [databases.dev, databases.test]) {
      await client`drop database if exists ${client(name)} with (force)`;
    }
  });
}

function databaseUrl(name: string): string {
  const url = new URL(baseDatabaseUrl());
  url.pathname = `/${name}`;
  return url.toString();
}

// The factory only ever touches the local Supabase Postgres: it creates and drops databases.
function baseDatabaseUrl(): string {
  const url = process.env.FACTORY_DATABASE_URL ?? readEnvFile(".env").DATABASE_URL;
  if (!url) throw new Refusal("DATABASE_URL is not set in .env. Copy .env.example to .env, or set FACTORY_DATABASE_URL.");
  if (!LOCAL_HOSTS.includes(new URL(url).hostname)) {
    throw new Refusal("The factory refuses a database that is not the local one.");
  }
  return url;
}

function readEnvFile(name: string): Record<string, string | undefined> {
  const path = join(REPO_ROOT, name);
  return existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
}

async function withMaintenanceClient<T>(action: (client: postgres.Sql) => Promise<T>): Promise<T> {
  const url = new URL(baseDatabaseUrl());
  url.pathname = "/postgres";
  const client = postgres(url.toString(), { max: 1, onnotice: () => {} });
  try {
    return await action(client);
  } finally {
    await client.end();
  }
}

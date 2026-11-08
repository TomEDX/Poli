# Test database

`pnpm test` runs on the local Supabase Postgres (127.0.0.1:54322). The test setup drops and recreates the database named by `TEST_DATABASE_URL` on every run (`poli_test` by default), applies the migrations, and each test starts from empty tables. The name must end with `_test`: the setup refuses any other.

## Running it

The sandbox blocks the connection to the local database, like it blocks `gh` (see `docs/agents/issue-tracker.md`): run `pnpm test`, `pnpm exec drizzle-kit …`, the seed and the dev server with `sandbox_permissions: "require_escalated"` from the first call. Inside the sandbox, "connect EPERM 127.0.0.1:54322" and "ECONNREFUSED" are false alarms: never conclude that Supabase is down from them. The Supabase containers must be running (`pnpm exec supabase start`, Docker up).

## Several runs at once

Two test runs on the same database wipe each other's tables. When agents work in parallel, give each one its own database:

```sh
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/poli_<name>_test pnpm test
```

The setup creates it. Drop leftovers with `docker exec supabase_db_poli psql -U postgres -c 'drop database poli_<name>_test'`.

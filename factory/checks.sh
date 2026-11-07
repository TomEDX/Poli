#!/usr/bin/env bash
# The gate: what a branch must pass before any reviewer reads it. The gate script runs it from the
# job's worktree, after merging the base branch, with TEST_DATABASE_URL set to the job's own
# database. It prints each step and stops at the first failure.
set -euo pipefail

factory_dir="${FACTORY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
base_ref="${FACTORY_BASE_REF:-origin/develop}"

step() {
  printf '\n==> %s\n' "$*"
}

step "install"
pnpm install --frozen-lockfile --prefer-offline

step "lint"
pnpm lint

step "typecheck"
pnpm typecheck

step "test (${TEST_DATABASE_URL:-default test database})"
pnpm test

step "commitlint ${base_ref}..HEAD"
pnpm exec commitlint --from "$base_ref" --verbose

step "migration numbers"
node "$factory_dir/bin/gate" --check-migrations drizzle

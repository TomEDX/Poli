# Software factory

`factory/` turns `ready-for-agent` tickets into pull requests to `develop`, one ticket per worktree, branch and PR. It stops at "PR ready, every review PASS": the maintainer squash-merges. Run it from Codex with `/factory run`. The skills `factory` (orchestrator) and `implement-ticket` (builder) are not in the repository: they live with the other personal skills in `~/.agents/skills/`.

## Pieces

| File | Role |
| --- | --- |
| `factory/config.json` | Concurrency (2), rounds (3), the worktree directory, the Project, the paths that route each reviewer |
| `factory/bin/queue` | Open `ready-for-agent` tickets whose "blocked by" issues are all closed; never lists a closed or blocked ticket as startable, and updates Prêt / Bloqué on the board |
| `factory/bin/job` | The only writer of job state: `create`, `advance <job> <stage>`, `rework`, `sync`, `env`, `header`, `status`, `close`, `board-setup` |
| `factory/bin/gate` | Merges `origin/develop` into the branch, then runs `factory/checks.sh` with the job's databases |
| `factory/bin/route` | Chooses the reviewers from the files the diff touches |
| `factory/agents/*.md` | One prompt file per agent: builder, reviewer-code, -ui, -ux, -security |
| `factory/jobs/` | Exchange files between agents (ignored by git): `job.json`, `issue.md`, `build.md`, `round-N/` |

A job moves `ready` → `build` → `gate` → `review` → `to-validate`, or to `needs-human` after three failing rounds. The card on the Project follows: Bloqué, Prêt, Build, Gate, Review, À valider, Needs human, Mergé, with the Round, Risque and Reviews fields.

The gate always runs after the merge of `origin/develop`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `commitlint --from origin/develop`, and a check that the numbers in `drizzle/` are unique. A failure goes back to the builder with the log and no reviewer runs.

Reviewers are routed by path: code always; ui and ux when `src/app/**`, `src/components/**` or `src/modules/*/components/**` change; security when `drizzle/**`, a `schema.ts`, an `actions.ts` or `test/access-rules*` change. Each verdict is posted as a PR comment starting with `VERDICT: PASS` or `VERDICT: CHANGES`; UX screenshots are published on the `factory-screenshots` branch and linked in the comment.

## Isolation per job

For issue `<n>`, the job has its own worktree under `/private/tmp/poli-jobs/`, the branch `codex/<n>-<slug>`, the databases `poli_job<n>_dev` (migrated and seeded) and `poli_job<n>_test` (the name must end with `_test`: the test setup drops it on every run), and a port block (`3100` and `3110`; the UX reviewer takes the port plus one). `eval "$(factory/bin/job env <n>)"` exports `DATABASE_URL`, `TEST_DATABASE_URL` and `PORT`. The `.env*` files are copied into the worktree. The factory refuses any database that is not on 127.0.0.1 or localhost.

## Running in the sandbox

The Supabase Postgres and `gh` are out of the sandbox's reach, and so are git writes in a worktree (the repository's `.git` is read-only there). Run these with `sandbox_permissions: "require_escalated"` from the first call: `factory/bin/*`, `pnpm test`, `drizzle-kit`, the seed, `next dev`, `git add`, `git commit`. Inside the sandbox, "connect EPERM 127.0.0.1:54322", "Operation not permitted" on `index.lock` and "error connecting to api.github.com" are false alarms.

For `pnpm test` the local Supabase must be running (`pnpm exec supabase start`, Docker up). A test database is created per job by the test setup; you can drop leftovers with `docker exec supabase_db_poli psql -U postgres -c 'drop database poli_job<n>_test'`.

Approved prefix rules worth keeping: `factory/bin/job`, `factory/bin/queue`, `factory/bin/gate`, `factory/bin/route`, `pnpm test`, `git add`, `git commit`.

## One-time setup

1. `gh auth status` must list the `project` scope; otherwise run `gh auth refresh -s project,read:project`.
2. `factory/bin/job board-setup` adds the Round, Risque and Reviews fields and the Status options to the Project (idempotent).
3. In the Project, in the web interface: a Board view grouped by Status, the workflow "Auto-add to project" filtered on `label:ready-for-agent`, and the workflow "Pull request merged" set to Status = Mergé.

## Cleaning up

`factory/bin/queue` ends a job whose PR was merged or closed and removes its worktree and databases. `factory/bin/job close <job>` abandons one by hand. The `factory-screenshots` branch only holds review captures and can be deleted at any time.

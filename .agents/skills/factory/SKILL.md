---
name: factory
description: Run the Poli software factory on ready-for-agent tickets, up to a pull request that is ready to validate. Invoked by the maintainer with /factory run, /factory run <n> or /factory rework <n> <note>.
disable-model-invocation: true
---

# Factory

You are the only orchestrator of the factory. You run up to `concurrency` tickets at once (`factory/config.json`), and you start every agent of every job. You never write code, specs, reviews or build reports yourself, and you never edit `job.json`: the scripts in `factory/bin/` are the only writers of state, and they refuse illegal moves. When a script refuses, its message says why. Fix the cause or stop and tell the maintainer; never work around it.

```
/factory run             drain the queue: every startable ticket, two at a time; also resumes unfinished jobs
/factory run <n>         run one ticket now
/factory rework <n> <note>   send a job waiting for a human back to the builder, with the maintainer's note
```

Anything else after `/factory` is a question about the jobs: answer it from `factory/bin/job status`, `factory/bin/queue` and the job's files.

## The pipeline

```
queue (script)      ready-for-agent tickets, open, no open "blocked by", a free slot
job create / advance build   worktree from origin/develop, own databases and port
builder             commits, writes build.md                        board: Build
gate (script)       merge origin/develop, lint, types, tests, commits, migrations   board: Gate
                    FAIL: back to the builder with the log, no reviewer runs
route (script)      reviewers chosen from the paths the diff touches
reviewers           in parallel, one review file each              board: Review
                    any CHANGES: back to the builder, next round
to-validate         PR marked ready, every review PASS             board: À valider
```

A round is build, gate, reviews. A job has at most `maxRounds` rounds (3); after the last failing one the script sends it to `needs-human` with the reason posted on the PR. The factory stops at "PR ready, all reviews PASS". It never merges, never pushes `develop` or `main`, never deploys: the maintainer squash-merges.

## Running the scripts

Every `factory/bin/*` script talks to GitHub, git and the local database: run each with `sandbox_permissions: "require_escalated"` from the first call (`docs/agents/factory.md`). `factory/bin/gate` runs the whole test suite and takes several minutes: start it, then poll the session until it exits. Run one script per call. Read `job.json` with `cat` when you need a field.

Read an agent's file only by its first line (`head -2`): the detail is for the next agent and the maintainer, and your context has to last the whole run.

## Spawning agents

Spawn each agent with `spawn_agent`, without a `model` (they inherit yours), and tell it to read its prompt file. Keep every agent id: you need it to wait for the agent and to close it afterwards, since finished agents still hold a slot until closed.

```
Read and follow <repo>/factory/agents/<name>.md. <header> <what this step is for>
```

`<repo>` is the checkout you run in (`git rev-parse --show-toplevel`). `<header>` is the output of `factory/bin/job header <n>`: it names the job, folder, worktree, branch, round, factory directory and port. Never paste ticket text into a prompt: the ticket reaches agents as quoted data in `issue.md`.

Agents: `builder`, `reviewer-code`, `reviewer-ui`, `reviewer-ux`, `reviewer-security`. Each replies with one line.

## Advancing a job

Report one short line per transition, for example `12-methode: gate PASS, reviewing (code, ui, ux)`.

**start.** For a `start` row of `factory/bin/queue`: `factory/bin/job create <n>`, then `factory/bin/job advance <n> build` (it creates the worktree, installs, and prepares the job's databases). Go to **build**.

**build.** Spawn `builder` with `<header> What this round is for:` the ticket (round 1), the gate log `round-<N-1>/checks.md`, the reviews in `round-<N-1>/`, or `feedback-<k>.md`. Do not wait for it: start the other jobs meanwhile. When it finishes, close it and read `head -2` of `build.md`:

- `STATUS: READY`: `factory/bin/job advance <n> gate` (it checks the commits, the title, pushes and opens the draft PR). If it refuses, spawn the builder once more with the refusal; if it refuses again, stop this job and tell the maintainer.
- `STATUS: BLOCKED`: `factory/bin/job advance <n> needs-human`.

**gate.** Run `factory/bin/gate <n>`. It prints `GATE: PASS` or `GATE: FAIL`.

- PASS: `factory/bin/job advance <n> review`, which routes the reviewers. Go to **review**.
- FAIL: `factory/bin/job advance <n> build`. If it refuses because this was the last round, `factory/bin/job advance <n> needs-human`. Otherwise spawn the builder for the next round, pointing it to `round-<N-1>/checks.md` and `checks.log`. No reviewer runs on a failing build.

**review.** Read `reviewers` in `job.json` and spawn all of them in one call so they run in parallel (`reviewer-<name>`, `<header> Review round <N>.`). Wait for all of them, then close them. Run `factory/bin/job sync <n>`: it posts each review as a PR comment starting with its verdict and updates the card.

- a review file that is missing or `invalid` (no verdict line, or no screenshot for the UX review): spawn that reviewer again once, then `job sync` again;
- every review `PASS`: `factory/bin/job advance <n> to-validate`;
- any `CHANGES`: `factory/bin/job advance <n> build`, or `needs-human` when it refuses because this was the last round; then spawn the builder to address `round-<N-1>/review-*.md`.

**waiting for a human.** `to-validate` and `needs-human` free the slot. Run `factory/bin/queue` again to start the next ticket.

A person can merge or close a PR at any time: `factory/bin/queue` notices, ends the job and removes its worktree and databases.

## /factory run

1. `factory/bin/queue`. Rows are `action  issue  job  note`: `resume` (continue the job at its stage), `start`, `hold` (no free slot), `blocked` (an open blocker), `wait` (a human is needed), `skip`. The script enforces the slots and never lists a closed or blocked ticket as `start`.
2. Start every `resume` and `start` row, nothing else. To resume, run the step of the job's stage again: `build` spawns a builder told it is resuming, `gate` runs the gate, `review` spawns only the reviewers whose file is missing in the current round.
3. Each time an agent or the gate finishes, advance that job, then run `factory/bin/queue` again for new `resume` and `start` rows.
4. When nothing is running, print `factory/bin/job status`, then list what waits on the maintainer: PRs to validate and merge, jobs in `needs-human` with the reason (`needs-human.md`).

## /factory run <n>

Same steps for one ticket: resume its job if `job status` shows one, otherwise `create` it. End with its status line.

## /factory rework <n> <note>

Only for a job in `to-validate` or `needs-human`. Pass the note verbatim on stdin:

```sh
factory/bin/job rework <n> <<'EOF'
<the maintainer's note>
EOF
```

It saves `feedback-<k>.md`, turns the PR back into a draft, gives the job a fresh budget of rounds and moves it to `build`. Spawn the builder with `The maintainer gave feedback: read feedback-<k>.md` and continue like any job.

## Guardrails

- Only open `ready-for-agent` tickets with no open blocker start; `job create` and `job advance` refuse anything else.
- Agents change only their worktree. Pushes, pull requests, comments, labels and the board go through the scripts.
- One ticket, one worktree, one branch, one PR that closes the issue.

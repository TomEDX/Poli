import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { BASE_REF, config, FACTORY_DIR } from "./config.ts";
import { jobEnvironment, prepareDevDatabase } from "./databases.ts";
import { matchesGlob } from "./routing.ts";
import type { Job } from "./state.ts";
import { roundDirectory, updateJob } from "./state.ts";
import { git, run } from "./shell.ts";

const LOG_TAIL_LINES = 80;

// The gate merges the base branch into the job's branch, then judges the result: nothing the
// branch could change in the factory, the repo's checks, the development database and the push.
// It runs before any reviewer, and a failure goes back to the builder with the log.
export async function runGate(job: Job): Promise<boolean> {
  const directory = roundDirectory(job);
  mkdirSync(directory, { recursive: true });
  const logPath = join(directory, "checks.log");
  writeFileSync(logPath, "");
  const summary: string[] = [];

  const merge = mergeBase(job, logPath);
  summary.push(merge.message);
  const protectedChanges = merge.ok ? findProtectedChanges(job) : [];
  summary.push(`Protected paths: ${protectedChanges.length > 0 ? `changed: ${protectedChanges.join(", ")}` : "none changed"}`);

  let checksPassed = false;
  if (merge.ok) {
    const started = Date.now();
    const checks = await runChecks(job, logPath);
    checksPassed = checks.ok;
    summary.push(`checks.sh ${checks.ok ? "passed" : `failed: ${checks.reason}`} in ${Math.round((Date.now() - started) / 1000)}s`);
    if (checksPassed && protectedChanges.length === 0) summary.push(pushBranch(job));
  }

  const passed = merge.ok && checksPassed && protectedChanges.length === 0;
  const commit = git(job.worktree, "rev-parse", "HEAD").trim();
  writeChecksReport(job, { passed, commit, summary, logPath });
  updateJob(job.id, (current) => {
    current.gate = passed ? "PASS" : "FAIL";
  });
  return passed;
}

function mergeBase(job: Job, logPath: string): { ok: boolean; message: string } {
  git(job.worktree, "fetch", "origin", config.baseBranch);
  const result = run("git", ["merge", "--no-edit", BASE_REF], { cwd: job.worktree });
  appendFileSync(logPath, `==> merge ${BASE_REF}\n${result.stdout}${result.stderr}\n`);
  if (result.status === 0) return { ok: true, message: `${BASE_REF} merged into the branch` };
  const conflicts = run("git", ["diff", "--name-only", "--diff-filter=U"], { cwd: job.worktree }).stdout.trim();
  run("git", ["merge", "--abort"], { cwd: job.worktree });
  return {
    ok: false,
    message: `Merging ${BASE_REF} conflicts in: ${conflicts.split("\n").join(", ")}. Merge it yourself, resolve, commit.`,
  };
}

function findProtectedChanges(job: Job): string[] {
  const diff = git(job.worktree, "diff", "--name-status", `${BASE_REF}...HEAD`);
  return diff
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"))
    .filter(([status]) => !status.startsWith("A"))
    .filter(([, path]) => config.protectedPaths.some((pattern) => matchesGlob(path, pattern)))
    .map(([status, path]) => `${status[0]} ${path}`);
}

async function runChecks(job: Job, logPath: string): Promise<{ ok: boolean; reason: string }> {
  try {
    await prepareDevDatabase(job);
  } catch (error) {
    appendFileSync(logPath, `==> development database\n${String(error)}\n`);
    return { ok: false, reason: "the development database could not be migrated and seeded" };
  }
  const env = { ...process.env, ...jobEnvironment(job), FACTORY_DIR };
  const result = run("bash", ["-c", 'exec bash "$0" 2>&1', join(FACTORY_DIR, "checks.sh")], { cwd: job.worktree, env });
  appendFileSync(logPath, result.stdout);
  return { ok: result.status === 0, reason: `exit ${result.status}` };
}

// After a merge of the base the local branch is ahead of its remote: push, so the pull request
// shows what was tested.
function pushBranch(job: Job): string {
  const result = run("git", ["push", "origin", `HEAD:refs/heads/${job.branch}`], { cwd: job.worktree });
  return result.status === 0 ? `${job.branch} pushed` : `push failed: ${(result.stderr || result.stdout).trim()}`;
}

function writeChecksReport(
  job: Job,
  report: { passed: boolean; commit: string; summary: string[]; logPath: string },
): void {
  const log = run("tail", ["-n", String(LOG_TAIL_LINES), report.logPath]).stdout;
  const content = [
    `GATE: ${report.passed ? "PASS" : "FAIL"}`,
    `COMMIT: ${report.commit}`,
    "",
    "## Summary",
    ...report.summary.map((line) => `- ${line}`),
    "",
    `## Last ${LOG_TAIL_LINES} lines of checks.log`,
    "",
    "```",
    log.trimEnd(),
    "```",
    "",
  ].join("\n");
  writeFileSync(join(roundDirectory(job), "checks.md"), content);
}

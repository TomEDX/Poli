import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { join } from "node:path";

import type { ReviewerName, Risk } from "./config.ts";
import { JOBS_DIR } from "./config.ts";
import { Refusal } from "./shell.ts";
import type { Stage } from "./transitions.ts";

export type ReviewState = "PASS" | "CHANGES" | "pending" | "invalid";

export type BoardSnapshot = {
  status: string | null;
  round: number | null;
  risk: string | null;
  reviews: string | null;
};

export type Job = {
  id: string;
  issue: number;
  title: string;
  issueUrl: string;
  stage: Stage;
  round: number;
  roundLimit: number;
  branch: string;
  worktree: string;
  slot: number | null;
  port: number | null;
  databases: { dev: string; test: string };
  pr: number | null;
  prUrl: string | null;
  projectItemId: string | null;
  risk: Risk | null;
  reviewers: ReviewerName[];
  gate: "PASS" | "FAIL" | null;
  reviews: Record<string, ReviewState>;
  postedReviews: string[];
  board: BoardSnapshot;
  createdAt: string;
  endedAt: string | null;
};

// Every writer of job.json goes through updateJob, so two scripts never overwrite each other.
export function updateJob(id: string, change: (job: Job) => void): Job {
  return withLock(id, () => {
    const job = readJob(id);
    change(job);
    writeJob(job);
    return job;
  });
}

export function createJobFile(job: Job): void {
  mkdirSync(jobDirectory(job.id), { recursive: true });
  writeJob(job);
}

export function readJob(id: string): Job {
  const path = join(jobDirectory(id), "job.json");
  if (!existsSync(path)) throw new Refusal(`No job ${id}.`);
  return JSON.parse(readFileSync(path, "utf8")) as Job;
}

export function listJobs(): Job[] {
  if (!existsSync(JOBS_DIR)) return [];
  return readdirSync(JOBS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(JOBS_DIR, entry.name, "job.json")))
    .map((entry) => readJob(entry.name))
    .sort((a, b) => a.issue - b.issue);
}

// A job is named by its id (12-dark-mode) or by its issue number (12).
export function resolveJob(reference: string): Job {
  if (!/^\d+$/.test(reference)) return readJob(reference);
  const job = listJobs().find((candidate) => candidate.issue === Number(reference));
  if (!job) throw new Refusal(`No job for issue #${reference}.`);
  return job;
}

export function jobDirectory(id: string): string {
  return join(JOBS_DIR, id);
}

export function roundDirectory(job: Job, round = job.round): string {
  return join(jobDirectory(job.id), `round-${round}`);
}

export function withLock<T>(name: string, action: () => T): T {
  mkdirSync(JOBS_DIR, { recursive: true });
  const path = join(JOBS_DIR, `.${name}.lock`);
  const deadline = Date.now() + 120_000;
  while (!tryAcquire(path)) {
    if (Date.now() > deadline) throw new Refusal(`Could not lock ${name}: another factory script holds it.`);
    sleep(200);
  }
  try {
    return action();
  } finally {
    rmSync(path, { force: true });
  }
}

function writeJob(job: Job): void {
  const path = join(jobDirectory(job.id), "job.json");
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(job, null, 2)}\n`);
  renameSync(temporary, path);
}

function tryAcquire(path: string): boolean {
  try {
    const descriptor = openSync(path, "wx");
    writeSync(descriptor, String(process.pid));
    closeSync(descriptor);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (isStale(path)) rmSync(path, { force: true });
    return false;
  }
}

function isStale(path: string): boolean {
  try {
    process.kill(Number(readFileSync(path, "utf8")), 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH";
  }
}

function sleep(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

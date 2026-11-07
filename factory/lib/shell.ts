import { spawnSync } from "node:child_process";

import { REPO_ROOT } from "./config.ts";

export type RunOptions = { cwd?: string; input?: string; env?: NodeJS.ProcessEnv };

export type RunResult = { status: number; stdout: string; stderr: string };

// A refusal carries the message the orchestrator reads: it says why and what to do.
export class Refusal extends Error {}

export function run(command: string, args: string[], options: RunOptions = {}): RunResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    input: options.input,
    env: options.env,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw new Refusal(`${command} could not start: ${result.error.message}`);
  return { status: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

export function runOrRefuse(command: string, args: string[], options: RunOptions = {}): string {
  const result = run(command, args, options);
  if (result.status !== 0) {
    const output = (result.stderr || result.stdout).trim();
    throw new Refusal(`\`${[command, ...args].join(" ")}\` failed: ${output}`);
  }
  return result.stdout;
}

export function git(cwd: string, ...args: string[]): string {
  return runOrRefuse("git", args, { cwd });
}

export function gh(...args: string[]): string {
  return runOrRefuse("gh", args);
}

export function ghJson<T>(...args: string[]): T {
  return JSON.parse(gh(...args)) as T;
}

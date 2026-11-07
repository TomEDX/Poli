import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { config } from "./config.ts";
import { gh, ghJson } from "./shell.ts";

export type PullRequestState = "OPEN" | "MERGED" | "CLOSED";

// The builder only commits; the scripts push, open the draft pull request and keep its title and
// body in line with the latest build.
export function ensureDraftPullRequest(branch: string, title: string, body: string): { number: number; url: string } {
  const bodyFile = writeTemporaryFile("body.md", body);
  const existing = findOpenPullRequest(branch);
  if (existing) {
    gh("pr", "edit", String(existing.number), "--title", title, "--body-file", bodyFile);
    return existing;
  }
  gh("pr", "create", "--draft", "--base", config.baseBranch, "--head", branch, "--title", title, "--body-file", bodyFile);
  const created = findOpenPullRequest(branch);
  if (!created) throw new Error(`The pull request of ${branch} was not created.`);
  return created;
}

export function pullRequestState(number: number): PullRequestState {
  return ghJson<{ state: PullRequestState }>("pr", "view", String(number), "--json", "state").state;
}

export function isDraft(number: number): boolean {
  return ghJson<{ isDraft: boolean }>("pr", "view", String(number), "--json", "isDraft").isDraft;
}

export function markReady(number: number): void {
  if (isDraft(number)) gh("pr", "ready", String(number));
}

export function markDraft(number: number): void {
  if (!isDraft(number)) gh("pr", "ready", String(number), "--undo");
}

export function commentOnPullRequest(number: number, body: string): void {
  gh("pr", "comment", String(number), "--body-file", writeTemporaryFile("comment.md", body));
}

export function commentOnIssue(number: number, body: string): void {
  gh("issue", "comment", String(number), "--body-file", writeTemporaryFile("comment.md", body));
}

function findOpenPullRequest(branch: string): { number: number; url: string } | undefined {
  const found = ghJson<{ number: number; url: string }[]>(
    "pr",
    "list",
    "--head",
    branch,
    "--state",
    "open",
    "--json",
    "number,url",
  );
  return found[0];
}

function writeTemporaryFile(name: string, content: string): string {
  const path = join(mkdtempSync(join(tmpdir(), "factory-")), name);
  writeFileSync(path, content);
  return path;
}

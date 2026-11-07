import { copyFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { config, REPO_ROOT } from "./config.ts";
import { git, run, runOrRefuse } from "./shell.ts";

export type PublishedScreenshot = { name: string; url: string };

// Pull request comments cannot hold uploaded files through the API, so captures go to an orphan
// branch of the repository and the comment links them by commit.
export function publishScreenshots(pullRequest: number, round: number, files: string[]): PublishedScreenshot[] {
  const remote = git(REPO_ROOT, "remote", "get-url", "origin").trim();
  const workdir = mkdtempSync(join(tmpdir(), "factory-screenshots-"));
  const branch = config.screenshotsBranch;

  const branchExists = run("git", ["ls-remote", "--exit-code", "--heads", remote, branch]).status === 0;
  if (branchExists) {
    runOrRefuse("git", ["clone", "--quiet", "--depth", "1", "--branch", branch, remote, workdir]);
  } else {
    git(workdir, "init", "--quiet", "-b", branch);
    git(workdir, "remote", "add", "origin", remote);
  }

  const folder = `pr-${pullRequest}/round-${round}`;
  mkdirSync(join(workdir, folder), { recursive: true });
  const names = files.map((file) => basename(file).replace(/[^a-zA-Z0-9._-]/g, "-"));
  files.forEach((file, index) => copyFileSync(file, join(workdir, folder, names[index])));

  git(workdir, "add", folder);
  git(workdir, "commit", "--quiet", "-m", `chore: add screenshots of PR #${pullRequest}, round ${round}`);
  git(workdir, "push", "--quiet", "origin", `HEAD:refs/heads/${branch}`);
  const commit = git(workdir, "rev-parse", "HEAD").trim();

  return names.map((name) => ({
    name,
    url: `https://raw.githubusercontent.com/${config.repository}/${commit}/${folder}/${name}`,
  }));
}

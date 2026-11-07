import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { ReviewerName } from "./config.ts";
import { commentOnPullRequest } from "./pull-request.ts";
import { publishScreenshots } from "./screenshots.ts";
import type { Job, ReviewState } from "./state.ts";
import { roundDirectory } from "./state.ts";

const VERDICT_LINE = /^VERDICT: (PASS|CHANGES)$/;
const IMAGE_FILE = /\.(png|jpe?g|webp)$/i;

export function reviewPath(job: Job, reviewer: ReviewerName, round = job.round): string {
  return join(roundDirectory(job, round), `review-${reviewer}.md`);
}

export function screenshotsDirectory(job: Job, round = job.round): string {
  return join(roundDirectory(job, round), "ux");
}

// A review is the first line of its file: VERDICT: PASS or VERDICT: CHANGES. The UX review also
// needs at least one capture, since it must show what it saw.
export function readReviewStates(job: Job): Record<string, ReviewState> {
  const states: Record<string, ReviewState> = {};
  for (const reviewer of job.reviewers) {
    const path = reviewPath(job, reviewer);
    if (!existsSync(path)) {
      states[reviewer] = "pending";
      continue;
    }
    const verdict = readFileSync(path, "utf8").split("\n", 1)[0].trim().match(VERDICT_LINE)?.[1];
    const missingCaptures = reviewer === "ux" && listScreenshots(job).length === 0;
    states[reviewer] = verdict && !missingCaptures ? (verdict as ReviewState) : "invalid";
  }
  return states;
}

// Each review becomes one comment on the pull request, starting with its verdict line. The hidden
// marker at the end names the reviewer and the round.
export function postNewReviews(job: Job, states: Record<string, ReviewState>): string[] {
  if (job.pr === null) return [];
  const posted: string[] = [];
  for (const reviewer of job.reviewers) {
    const key = `${reviewer}:${job.round}`;
    if (job.postedReviews.includes(key) || (states[reviewer] !== "PASS" && states[reviewer] !== "CHANGES")) continue;
    commentOnPullRequest(job.pr, reviewComment(job, reviewer));
    posted.push(key);
  }
  return posted;
}

function reviewComment(job: Job, reviewer: ReviewerName): string {
  const body = readFileSync(reviewPath(job, reviewer), "utf8").trim();
  const captures = reviewer === "ux" ? screenshotsSection(job) : "";
  const footer = `_Review **${reviewer}**, round ${job.round}/${job.roundLimit}._`;
  return `${body}\n${captures}\n---\n${footer}\n\n<!-- factory-review:${reviewer}:round-${job.round} -->\n`;
}

function screenshotsSection(job: Job): string {
  const published = publishScreenshots(job.pr ?? 0, job.round, listScreenshots(job));
  const images = published.map((shot) => `![${shot.name}](${shot.url})`).join("\n\n");
  return `\n## Captures\n\n${images}\n`;
}

function listScreenshots(job: Job): string[] {
  const directory = screenshotsDirectory(job);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => IMAGE_FILE.test(name))
    .sort()
    .map((name) => join(directory, name));
}

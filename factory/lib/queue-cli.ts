import { syncIssueStatuses } from "./board.ts";
import { runCli } from "./cli.ts";
import { config } from "./config.ts";
import { reconcileJobs } from "./job-commands.ts";
import { planQueue } from "./queue.ts";
import { listJobs } from "./state.ts";
import { fetchReadyIssues } from "./tickets.ts";

const USAGE = "Usage: queue [--no-board]";

// Lists what the factory can do, one tab-separated row per ticket: action, issue, job, note.
// Actions: resume (pick the job up at its stage), start, hold (no free slot), blocked (an open
// blocker), wait (a human is needed), skip. It also ends jobs whose PR was merged or closed.
export async function main(argv: string[]): Promise<void> {
  await runCli("queue", async () => {
    if (argv.some((arg) => arg !== "--no-board")) {
      console.error(USAGE);
      return 1;
    }
    for (const note of await reconcileJobs()) console.error(note);

    const issues = fetchReadyIssues();
    const jobs = listJobs();
    for (const row of planQueue(issues, jobs, config.concurrency)) {
      console.log([row.action, row.issue, row.job, row.note].join("\t"));
    }
    if (!argv.includes("--no-board")) syncIssueStatuses(issuesWithoutJob(issues, jobs));
  });
}

function issuesWithoutJob(issues: ReturnType<typeof fetchReadyIssues>, jobs: ReturnType<typeof listJobs>) {
  const withJob = new Set(jobs.map((job) => job.issue));
  return issues
    .filter((issue) => !withJob.has(issue.number))
    .map((issue) => ({
      issue: issue.number,
      url: issue.url,
      status: issue.blockedBy.length > 0 ? ("Bloqué" as const) : ("Prêt" as const),
    }));
}

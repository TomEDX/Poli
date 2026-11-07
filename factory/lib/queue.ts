import type { Job } from "./state.ts";
import { SLOT_STAGES } from "./transitions.ts";

export type ReadyIssue = { number: number; title: string; url: string; blockedBy: number[] };

export type QueueAction = "resume" | "start" | "hold" | "blocked" | "wait" | "skip";

export type QueueRow = { action: QueueAction; issue: number; job: string; note: string };

// Rows come out in the order to act on them. A ticket starts only when it is open, labelled, not
// blocked by an open issue and a concurrency slot is free; the others show why they wait.
export function planQueue(
  issues: ReadyIssue[],
  jobs: Pick<Job, "id" | "issue" | "stage" | "pr">[],
  concurrency: number,
): QueueRow[] {
  const jobByIssue = new Map(jobs.map((job) => [job.issue, job]));
  const resumes: QueueRow[] = [];
  const candidates: QueueRow[] = [];
  const blocked: QueueRow[] = [];
  const others: QueueRow[] = [];

  for (const issue of [...issues].sort((a, b) => a.number - b.number)) {
    const job = jobByIssue.get(issue.number);
    if (!job) {
      if (issue.blockedBy.length > 0) {
        blocked.push({ action: "blocked", issue: issue.number, job: "-", note: `blocked by ${formatIssues(issue.blockedBy)}` });
      } else {
        candidates.push({ action: "start", issue: issue.number, job: "-", note: issue.title });
      }
    } else if (SLOT_STAGES.includes(job.stage)) {
      resumes.push({ action: "resume", issue: issue.number, job: job.id, note: job.stage });
    } else if (job.stage === "to-validate" || job.stage === "needs-human") {
      others.push({ action: "wait", issue: issue.number, job: job.id, note: waitingNote(job) });
    } else {
      others.push({ action: "skip", issue: issue.number, job: job.id, note: `job is ${job.stage}` });
    }
  }

  let freeSlots = concurrency - jobs.filter((job) => SLOT_STAGES.includes(job.stage)).length;
  const starts = candidates.map((row): QueueRow => {
    if (freeSlots > 0) {
      freeSlots -= 1;
      return row;
    }
    return { ...row, action: "hold", note: `concurrency ${concurrency} reached` };
  });

  return [...resumes, ...starts, ...blocked, ...others];
}

function waitingNote(job: Pick<Job, "stage" | "pr">): string {
  if (job.stage === "to-validate") return `PR #${job.pr} to validate and merge`;
  return job.pr ? `needs a human, see PR #${job.pr}` : "needs a human";
}

function formatIssues(numbers: number[]): string {
  return numbers.map((number) => `#${number}`).join(", ");
}

import { config } from "./config.ts";
import type { ReadyIssue } from "./queue.ts";
import { gh, ghJson } from "./shell.ts";

export type TicketDetails = {
  number: number;
  title: string;
  body: string;
  state: string;
  url: string;
  labels: string[];
  comments: { author: string; createdAt: string; body: string }[];
};

// Open issues carrying the queue label, each with the open issues that block it (native
// "blocked by" links). Pull requests share the issues endpoint and are left out, and so are
// parent issues (the spec the tickets were cut from): only their sub-issues are work to build.
export function fetchReadyIssues(): ReadyIssue[] {
  const lines = gh(
    "api",
    "--paginate",
    `repos/${config.repository}/issues?state=open&labels=${config.queueLabel}&per_page=100`,
    "--jq",
    ".[] | select(.pull_request == null and (.sub_issues_summary.total // 0) == 0) | {number, title, url: .html_url} | tojson",
  );
  return lines
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Omit<ReadyIssue, "blockedBy">)
    .map((issue) => ({ ...issue, blockedBy: fetchOpenBlockers(issue.number) }));
}

export function fetchOpenBlockers(issue: number): number[] {
  const output = gh(
    "api",
    `repos/${config.repository}/issues/${issue}/dependencies/blocked_by`,
    "--jq",
    '.[] | select(.state == "open") | .number',
  );
  return output.split("\n").filter(Boolean).map(Number);
}

export function fetchTicket(issue: number): TicketDetails {
  const raw = ghJson<{
    number: number;
    title: string;
    body: string;
    state: string;
    url: string;
    labels: { name: string }[];
    comments: { author: { login: string }; createdAt: string; body: string }[];
  }>("issue", "view", String(issue), "--json", "number,title,body,state,url,labels,comments");
  return {
    ...raw,
    labels: raw.labels.map((label) => label.name),
    comments: raw.comments.map((comment) => ({
      author: comment.author.login,
      createdAt: comment.createdAt,
      body: comment.body,
    })),
  };
}

// The parent issue is the spec the tickets were cut from; null when the ticket has none.
export function fetchParentTicket(issue: number): TicketDetails | null {
  try {
    const parent = ghJson<{ number: number }>("api", `repos/${config.repository}/issues/${issue}/parent`);
    return fetchTicket(parent.number);
  } catch {
    return null;
  }
}

import { describe, expect, it } from "vitest";

import { planQueue, type ReadyIssue } from "./queue.ts";

const issue = (number: number, blockedBy: number[] = []): ReadyIssue => ({
  number,
  title: `Ticket ${number}`,
  url: `https://example.org/${number}`,
  blockedBy,
});

describe("planQueue", () => {
  it("starts a ticket whose blockers are all closed", () => {
    expect(planQueue([issue(5)], [], 2)).toEqual([{ action: "start", issue: 5, job: "-", note: "Ticket 5" }]);
  });

  it("never starts a ticket that still has an open blocker", () => {
    const [row] = planQueue([issue(6, [5, 4])], [], 2);
    expect(row).toEqual({ action: "blocked", issue: 6, job: "-", note: "blocked by #5, #4" });
  });

  it("holds the tickets beyond the free slots, in issue order", () => {
    const rows = planQueue([issue(9), issue(7), issue(3), issue(8)], [{ id: "3-x", issue: 3, stage: "build", pr: null }], 2);
    expect(rows.map((row) => [row.action, row.issue])).toEqual([
      ["resume", 3],
      ["start", 7],
      ["hold", 8],
      ["hold", 9],
    ]);
  });

  it("frees the slot of a job that waits for a human", () => {
    const jobs = [
      { id: "3-x", issue: 3, stage: "to-validate" as const, pr: 40 },
      { id: "4-y", issue: 4, stage: "needs-human" as const, pr: null },
    ];
    const rows = planQueue([issue(3), issue(4), issue(7), issue(8)], jobs, 2);
    expect(rows.filter((row) => row.action === "start").map((row) => row.issue)).toEqual([7, 8]);
    expect(rows.filter((row) => row.action === "wait").map((row) => row.issue)).toEqual([3, 4]);
  });

  it("does not restart a ticket whose job already ended", () => {
    const [row] = planQueue([issue(3)], [{ id: "3-x", issue: 3, stage: "closed", pr: null }], 2);
    expect(row.action).toBe("skip");
  });
});

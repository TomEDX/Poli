import { config } from "./config.ts";
import type { BoardSnapshot, Job } from "./state.ts";
import { BOARD_STATUS } from "./transitions.ts";
import { gh, ghJson } from "./shell.ts";

export type IssueBoardStatus = "Prêt" | "Bloqué";

type Field = { id: string; name: string; options?: { id: string; name: string }[] };

type Project = { id: string; fields: Field[] };

type BoardItem = { id: string; content?: { number?: number; type?: string }; status?: string };

const REVIEW_ICON = { PASS: "✅", CHANGES: "⚠️", pending: "⏳", invalid: "❓" } as const;

let cachedProject: Project | undefined;

// Moves the job's card and fills its fields. The board is a view: a failure here warns and never
// stops the pipeline. Returns the snapshot of what the card now shows.
export function syncJobBoard(job: Job): { itemId: string | null; snapshot: BoardSnapshot } {
  const wanted = wantedSnapshot(job);
  try {
    const itemId = job.projectItemId ?? addToBoard(job.issueUrl);
    const known = job.board;
    if (wanted.status !== null && wanted.status !== known.status) setSelect(itemId, "Status", wanted.status);
    if (wanted.round !== null && wanted.round !== known.round) setNumber(itemId, "Round", wanted.round);
    if (wanted.risk !== null && wanted.risk !== known.risk) setSelect(itemId, "Risque", wanted.risk);
    if (wanted.reviews !== null && wanted.reviews !== known.reviews) setText(itemId, "Reviews", wanted.reviews);
    return { itemId, snapshot: { ...known, ...definedEntries(wanted) } };
  } catch (error) {
    warn(error);
    return { itemId: job.projectItemId, snapshot: job.board };
  }
}

// Tickets without a job show whether they can start: Prêt, or Bloqué while a blocker is open.
export function syncIssueStatuses(entries: { issue: number; url: string; status: IssueBoardStatus }[]): void {
  try {
    const items = ghJson<{ items: BoardItem[] }>(
      "project",
      "item-list",
      String(config.project.number),
      "--owner",
      config.project.owner,
      "--limit",
      "500",
      "--format",
      "json",
    ).items;
    for (const entry of entries) {
      const item = items.find((candidate) => candidate.content?.number === entry.issue);
      if (item?.status === entry.status) continue;
      setSelect(item?.id ?? addToBoard(entry.url), "Status", entry.status);
    }
  } catch (error) {
    warn(error);
  }
}

export function reviewsText(reviews: Job["reviews"]): string {
  return Object.entries(reviews)
    .map(([name, state]) => `${name} ${REVIEW_ICON[state]}`)
    .join(" ");
}

function wantedSnapshot(job: Job): BoardSnapshot {
  return {
    status: BOARD_STATUS[job.stage],
    round: job.round > 0 ? job.round : null,
    risk: job.risk,
    reviews: Object.keys(job.reviews).length > 0 ? reviewsText(job.reviews) : null,
  };
}

function definedEntries(snapshot: BoardSnapshot): Partial<BoardSnapshot> {
  return Object.fromEntries(Object.entries(snapshot).filter(([, value]) => value !== null));
}

function addToBoard(issueUrl: string): string {
  const added = ghJson<{ id: string }>(
    "project",
    "item-add",
    String(config.project.number),
    "--owner",
    config.project.owner,
    "--url",
    issueUrl,
    "--format",
    "json",
  );
  return added.id;
}

function setSelect(itemId: string, fieldName: string, optionName: string): void {
  const field = findField(fieldName);
  const option = field.options?.find((candidate) => candidate.name === optionName);
  if (!option) throw new Error(`The board field ${fieldName} has no option "${optionName}".`);
  editItem(itemId, field, ["--single-select-option-id", option.id]);
}

function setNumber(itemId: string, fieldName: string, value: number): void {
  editItem(itemId, findField(fieldName), ["--number", String(value)]);
}

function setText(itemId: string, fieldName: string, value: string): void {
  editItem(itemId, findField(fieldName), ["--text", value]);
}

function editItem(itemId: string, field: Field, valueArguments: string[]): void {
  gh("project", "item-edit", "--id", itemId, "--project-id", loadProject().id, "--field-id", field.id, ...valueArguments);
}

function findField(name: string): Field {
  const field = loadProject().fields.find((candidate) => candidate.name === name);
  if (!field) throw new Error(`The board has no field "${name}". Run factory/bin/job board-setup.`);
  return field;
}

function loadProject(): Project {
  if (!cachedProject) {
    const number = String(config.project.number);
    const view = ghJson<{ id: string }>("project", "view", number, "--owner", config.project.owner, "--format", "json");
    const fields = ghJson<{ fields: Field[] }>(
      "project",
      "field-list",
      number,
      "--owner",
      config.project.owner,
      "--limit",
      "50",
      "--format",
      "json",
    ).fields;
    cachedProject = { id: view.id, fields };
  }
  return cachedProject;
}

function warn(error: unknown): void {
  console.error(`board: ${error instanceof Error ? error.message : String(error)}`);
}

export type Stage =
  | "ready"
  | "build"
  | "gate"
  | "review"
  | "to-validate"
  | "needs-human"
  | "merged"
  | "closed";

// The Status column of the board, in French. A closed job leaves the card where it is.
export const BOARD_STATUS: Record<Stage, string | null> = {
  ready: "Prêt",
  build: "Build",
  gate: "Gate",
  review: "Review",
  "to-validate": "À valider",
  "needs-human": "Needs human",
  merged: "Mergé",
  closed: null,
};

// A job in one of these stages holds one of the concurrency slots.
export const SLOT_STAGES: Stage[] = ["ready", "build", "gate", "review"];

export const TERMINAL_STAGES: Stage[] = ["merged", "closed"];

const TRANSITIONS: Record<Stage, Stage[]> = {
  ready: ["build"],
  build: ["gate", "needs-human"],
  gate: ["review", "build", "needs-human"],
  review: ["to-validate", "build", "needs-human"],
  "to-validate": ["build"],
  "needs-human": ["build"],
  merged: [],
  closed: [],
};

// Any unfinished job can end as merged or closed: a person may merge or abandon it at any time.
export function isLegalTransition(from: Stage, to: Stage): boolean {
  if (TERMINAL_STAGES.includes(from)) return false;
  if (TERMINAL_STAGES.includes(to)) return true;
  return TRANSITIONS[from].includes(to);
}

// Only a failed round can start another one, and only while the round budget lasts.
export function hasRoundLeft(round: number, roundLimit: number): boolean {
  return round < roundLimit;
}

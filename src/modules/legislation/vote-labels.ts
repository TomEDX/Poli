import { formatFiledOn } from "./text-labels";
import type { GroupCounts } from "./group-counts";
import type { VoteSubject } from "./vote-kinds";

// What a scrutin was about, as a heading: "Vote sur l’ensemble du texte".
export const voteSubjectHeadings: Record<VoteSubject, string> = {
  whole_text: "Vote sur l’ensemble du texte",
  article: "Vote sur un article",
  amendment: "Vote sur un amendement",
  motion: "Vote sur une motion",
};

// How the Assemblée names a scrutin: "Scrutin n° 412".
export function voteReference({ number }: { number: number }): string {
  return `Scrutin n°\u00a0${number}`;
}

// A scrutin date is a day, shown like a filing date.
export function formatHeldOn(isoDate: string): string {
  return formatFiledOn(isoDate);
}

// "30 pour · 2 contre · 1 abstention · 0 non-votant"
export function formatCounts(counts: GroupCounts): string {
  return [
    `${counts.for} pour`,
    `${counts.against} contre`,
    `${counts.abstention} abstention${counts.abstention > 1 ? "s" : ""}`,
    `${counts.nonVoting} non-votant${counts.nonVoting > 1 ? "s" : ""}`,
  ].join(" · ");
}


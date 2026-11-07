import type { AmendmentFate } from "./amendment-kinds";

// How the Assemblée names an amendment: "Amendement n° 12".
export function amendmentReference({ number }: { number: number }): string {
  return `Amendement n°\u00a0${number}`;
}

// Only these fates come out of a vote; an amendment withdrawn, not moved, fallen or
// inadmissible was never put to the vote.
export function wasVotedOn(fate: AmendmentFate): boolean {
  return fate === "adopted" || fate === "rejected";
}


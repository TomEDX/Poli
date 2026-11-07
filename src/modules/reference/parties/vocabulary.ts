import type { PartyChanges } from "./queries";

// A party's and its candidacy's labels and messages, without Drizzle so that client-side
// code can use them.
export type LabelledCandidacy = { candidateName: string | null; party: { name: string; abbreviation: string } };

// Shared by the public pages and the administration, so both always show the same name.
export function candidacyLabel({ candidateName, party }: LabelledCandidacy): string {
  return candidateName === null ? party.name : `${candidateName} (${party.abbreviation})`;
}

// Shared by the Server Actions and the new party form, which shows each one under its field.
export function partyNameTakenMessage(party: PartyChanges) {
  return `Le nom « ${party.name} » est déjà pris par un autre parti.`;
}

export function abbreviationTakenMessage(party: PartyChanges) {
  return `Le sigle « ${party.abbreviation} » est déjà pris par un autre parti.`;
}

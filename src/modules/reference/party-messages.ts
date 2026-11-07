import type { PartyChanges } from "./parties/queries";

// Shared by the Server Actions and the new party form, which shows each one under its field.
export function partyNameTakenMessage(party: PartyChanges) {
  return `Le nom « ${party.name} » est déjà pris par un autre parti.`;
}

export function abbreviationTakenMessage(party: PartyChanges) {
  return `Le sigle « ${party.abbreviation} » est déjà pris par un autre parti.`;
}

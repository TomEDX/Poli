import type { ParliamentaryGroupChanges } from "./parliamentary-groups";

// Shared by the Server Actions and the group form, which shows each one under its field.
export function groupNameTakenMessage(group: ParliamentaryGroupChanges) {
  return `Le nom « ${group.name} » est déjà pris par un autre groupe parlementaire.`;
}

export function groupAbbreviationTakenMessage(group: ParliamentaryGroupChanges) {
  return `Le sigle « ${group.abbreviation} » est déjà pris par un autre groupe parlementaire.`;
}

export const groupInUseMessage =
  "Ce groupe a voté dans un scrutin ou est celui de l’auteur d’un amendement : il ne peut plus être supprimé.";

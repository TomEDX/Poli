// Shared by the Server Actions and the scrutin form.
export const groupVotedTwiceMessage = "Un groupe ne vote qu’une fois par scrutin.";

export const amendmentVotedTwiceMessage = "Cet amendement est déjà relié à un autre scrutin.";

export function voteNumberTakenMessage(number: number): string {
  return `Le scrutin n°\u00a0${number} est déjà saisi pour ce texte.`;
}

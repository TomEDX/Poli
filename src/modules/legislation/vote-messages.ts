// Shared by the Server Actions and the scrutin form.
export const groupVotedTwiceMessage = "Un groupe ne vote qu’une fois par scrutin.";

// The groups changed while the editor filled the form.
export const missingGroupVoteMessage =
  "Saisissez la position de chaque groupe de la législature en cours : rechargez la page pour voir la liste à jour.";

export const voteGroupOutsideLegislatureMessage =
  "Un des groupes ne siège pas dans la législature en cours : rechargez la page pour voir la liste à jour.";

export const amendmentVotedTwiceMessage = "Cet amendement est déjà relié à un autre scrutin.";

export function voteNumberTakenMessage(number: number): string {
  return `Le scrutin n°\u00a0${number} est déjà saisi pour ce texte.`;
}

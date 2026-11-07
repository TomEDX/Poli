// Shared by the Server Actions and the amendment form.
export function amendmentNumberTakenMessage(number: number): string {
  return `L’amendement n°\u00a0${number} est déjà saisi pour ce texte.`;
}

export const authorGroupOutsideLegislatureMessage =
  "Le groupe de l’auteur ne siège pas dans la législature en cours : choisissez-en un dans la liste à jour.";


// Shared by the Server Actions and the form, which checks the same rule before sending.
export const noSubtopicMessage = "Rattachez le texte à au moins une sous-thématique avant de le publier.";

export function numberTakenMessage(number: number | undefined): string {
  return `Le numéro ${number} est déjà pris par un autre texte de la législature.`;
}

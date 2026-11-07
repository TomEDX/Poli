// Shared by the Server Actions and the form, which checks the same rule before sending.
export const noSubtopicMessage = "Rattachez le texte à au moins une sous-thématique avant de le publier.";

// A save that leaves the number unchanged cannot collide, yet its changes type the number as optional.
export function textNumberTakenMessage(number: number | undefined): string {
  const taken = number === undefined ? "Ce numéro" : `Le numéro ${number}`;
  return `${taken} est déjà pris par un autre texte de la législature.`;
}

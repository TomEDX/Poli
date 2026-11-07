// Shared by the Server Actions and the amendment form.
export function amendmentNumberTakenMessage(number: number): string {
  return `L’amendement n°\u00a0${number} est déjà saisi pour ce texte.`;
}


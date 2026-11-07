// A text's values, French labels and messages, kept apart from the schema so that
// client-side code can use them without Drizzle.
export type TextNature = (typeof textNatures)[number];

export const textNatures = ["government_bill", "member_bill"] as const;

export const textNatureLabels: Record<TextNature, string> = {
  government_bill: "Projet de loi",
  member_bill: "Proposition de loi",
};

// Shared by the Server Actions and the form, which checks the same rule before sending.
export const noSubtopicMessage = "Rattachez le texte à au moins une sous-thématique avant de le publier.";

const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

// What the home page says about the published texts: "3 textes examinés".
export function publishedTextCountLabel(published: number): string {
  if (published === 0) return "Aucun texte publié pour l'instant";
  return published === 1 ? "1 texte examiné" : `${published} textes examinés`;
}

// How the Assemblée names a text: "Projet de loi n° 105".
export function textReference({ nature, number }: { nature: TextNature; number: number }): string {
  return `${textNatureLabels[nature]} n°\u00a0${number}`;
}

// The date has no time, so it is read and shown in UTC: no time zone can move it by a day.
export function formatFiledOn(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`));
}

// A save that leaves the number unchanged cannot collide, yet its changes type the number as optional.
export function textNumberTakenMessage(number: number | undefined): string {
  const taken = number === undefined ? "Ce numéro" : `Le numéro ${number}`;
  return `${taken} est déjà pris par un autre texte de la législature.`;
}

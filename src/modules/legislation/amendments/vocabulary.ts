// An amendment's values, French labels and messages, kept apart from the schema so that
// client-side code can use them without Drizzle.
export type AmendmentFate = (typeof amendmentFates)[number];

export type AmendmentOpinion = (typeof amendmentOpinions)[number];

export const amendmentFates = ["adopted", "rejected", "withdrawn", "not_moved", "fallen", "inadmissible"] as const;

// "none" when the government or the committee gave no opinion, or when it is not known.
export const amendmentOpinions = ["favourable", "unfavourable", "wisdom", "none"] as const;

export const amendmentFateLabels: Record<AmendmentFate, string> = {
  adopted: "Adopté",
  rejected: "Rejeté",
  withdrawn: "Retiré",
  not_moved: "Non soutenu",
  fallen: "Tombé",
  inadmissible: "Irrecevable",
};

export const amendmentOpinionLabels: Record<AmendmentOpinion, string> = {
  favourable: "Favorable",
  unfavourable: "Défavorable",
  wisdom: "Sagesse",
  none: "Aucun avis",
};

// Shared by the Server Actions and the amendment form.
export const authorGroupOutsideLegislatureMessage =
  "Le groupe de l’auteur ne siège pas dans la législature en cours : choisissez-en un dans la liste à jour.";

// Only these fates come out of a vote; an amendment withdrawn, not moved, fallen or
// inadmissible was never put to the vote.
export function wasVotedOn(fate: AmendmentFate): boolean {
  return fate === "adopted" || fate === "rejected";
}

// How the Assemblée names an amendment: "Amendement n° 12".
export function amendmentReference({ number }: { number: number }): string {
  return `Amendement n°\u00a0${number}`;
}

export function amendmentNumberTakenMessage(number: number): string {
  return `L’amendement n°\u00a0${number} est déjà saisi pour ce texte.`;
}

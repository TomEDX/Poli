// Kept apart from the schema so that client-side code can use them without Drizzle.
export const amendmentFates = ["adopted", "rejected", "withdrawn", "not_moved", "fallen", "inadmissible"] as const;

export type AmendmentFate = (typeof amendmentFates)[number];

// "none" when the government or the committee gave no opinion, or when it is not known.
export const amendmentOpinions = ["favourable", "unfavourable", "wisdom", "none"] as const;

export type AmendmentOpinion = (typeof amendmentOpinions)[number];

// Only these fates come out of a vote; an amendment withdrawn, not moved, fallen or
// inadmissible was never put to the vote.
export function wasVotedOn(fate: AmendmentFate): boolean {
  return fate === "adopted" || fate === "rejected";
}

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


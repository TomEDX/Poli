// Kept apart from the schema so that client-side code can use it without Drizzle.
export const sourceKinds = ["program", "vote", "official_text", "other"] as const;

export type SourceKind = (typeof sourceKinds)[number];

export const sourceKindLabels: Record<SourceKind, string> = {
  program: "Programme",
  vote: "Scrutin",
  official_text: "Texte officiel",
  other: "Autre",
};

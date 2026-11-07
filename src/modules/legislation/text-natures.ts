// Kept apart from the schema so that client-side code can use it without Drizzle.
export const textNatures = ["government_bill", "member_bill"] as const;

export type TextNature = (typeof textNatures)[number];

export const textNatureLabels: Record<TextNature, string> = {
  government_bill: "Projet de loi",
  member_bill: "Proposition de loi",
};


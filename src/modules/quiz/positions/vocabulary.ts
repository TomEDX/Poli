// A position's values, French labels and messages, kept apart from the schema so that
// client-side code can use them without Drizzle.
export type Stance = (typeof stances)[number];

// null is "no position": the programme says nothing on the question.
export type PositionValue = Stance | null;

// From "strongly agree" to "strongly disagree", the same scale the visitor answers on.
export const stances = [2, 1, 0, -1, -2] as const;

export const stanceLabels: Record<Stance, string> = {
  2: "Tout à fait d’accord",
  1: "Plutôt d’accord",
  0: "Ni d’accord ni pas d’accord",
  [-1]: "Plutôt pas d’accord",
  [-2]: "Pas du tout d’accord",
};

export const noPositionLabel = "Pas de position";

export const candidacyPositionedTwiceMessage = "Une candidature n’a qu’une position par question.";

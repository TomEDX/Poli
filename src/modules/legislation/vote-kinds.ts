// Kept apart from the schema so that client-side code can use them without Drizzle.
export const voteSubjects = ["whole_text", "article", "amendment", "motion"] as const;

export type VoteSubject = (typeof voteSubjects)[number];

export const voteResults = ["adopted", "rejected"] as const;

export type VoteResult = (typeof voteResults)[number];

export const groupPositions = ["for", "against", "abstention", "non_voting"] as const;

export type GroupPosition = (typeof groupPositions)[number];

export const voteSubjectLabels: Record<VoteSubject, string> = {
  whole_text: "Ensemble du texte",
  article: "Article",
  amendment: "Amendement",
  motion: "Motion",
};

export const voteResultLabels: Record<VoteResult, string> = {
  adopted: "Adopté",
  rejected: "Rejeté",
};

export const groupPositionLabels: Record<GroupPosition, string> = {
  for: "Pour",
  against: "Contre",
  abstention: "Abstention",
  non_voting: "Non votant",
};

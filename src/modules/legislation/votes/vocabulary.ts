import { formatFiledOn } from "../texts/vocabulary";

// A scrutin's values, French labels and messages, kept apart from the schema so that
// client-side code can use them without Drizzle.
export type VoteSubject = (typeof voteSubjects)[number];

export type VoteResult = (typeof voteResults)[number];

export type GroupPosition = (typeof groupPositions)[number];

// How many members of the group voted each way.
export type GroupCounts = { for: number; against: number; abstention: number; nonVoting: number };

export const voteSubjects = ["whole_text", "article", "amendment", "motion"] as const;

export const voteResults = ["adopted", "rejected"] as const;

export const groupPositions = ["for", "against", "abstention", "non_voting"] as const;

export const voteSubjectLabels: Record<VoteSubject, string> = {
  whole_text: "Ensemble du texte",
  article: "Article",
  amendment: "Amendement",
  motion: "Motion",
};

// What a scrutin was about, as a heading: "Vote sur l’ensemble du texte".
export const voteSubjectHeadings: Record<VoteSubject, string> = {
  whole_text: "Vote sur l’ensemble du texte",
  article: "Vote sur un article",
  amendment: "Vote sur un amendement",
  motion: "Vote sur une motion",
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

// Shared by the Server Actions and the scrutin form.
export const groupVotedTwiceMessage = "Un groupe ne vote qu’une fois par scrutin.";

// The groups changed while the editor filled the form.
export const missingGroupVoteMessage =
  "Saisissez la position de chaque groupe de la législature en cours : rechargez la page pour voir la liste à jour.";

export const voteGroupOutsideLegislatureMessage =
  "Un des groupes ne siège pas dans la législature en cours : rechargez la page pour voir la liste à jour.";

export const amendmentVotedTwiceMessage = "Cet amendement est déjà relié à un autre scrutin.";

// How the Assemblée names a scrutin: "Scrutin n° 412".
export function voteReference({ number }: { number: number }): string {
  return `Scrutin n°\u00a0${number}`;
}

// A scrutin date is a day, shown like a filing date.
export function formatHeldOn(isoDate: string): string {
  return formatFiledOn(isoDate);
}

// "30 pour · 2 contre · 1 abstention · 0 non-votant"
export function formatCounts(counts: GroupCounts): string {
  return [
    `${counts.for} pour`,
    `${counts.against} contre`,
    `${counts.abstention} abstention${counts.abstention > 1 ? "s" : ""}`,
    `${counts.nonVoting} non-votant${counts.nonVoting > 1 ? "s" : ""}`,
  ].join(" · ");
}

// The four counts are entered together or not at all: null unless all four are known.
export function completeCounts(counts: { [Key in keyof GroupCounts]: number | null }): GroupCounts | null {
  const { for: inFavour, against, abstention, nonVoting } = counts;
  if (inFavour === null || against === null || abstention === null || nonVoting === null) return null;
  return { for: inFavour, against, abstention, nonVoting };
}

export function voteNumberTakenMessage(number: number): string {
  return `Le scrutin n°\u00a0${number} est déjà saisi pour ce texte.`;
}

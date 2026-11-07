// How many members of the group voted each way.
export type GroupCounts = { for: number; against: number; abstention: number; nonVoting: number };

// The four counts are entered together or not at all: null unless all four are known.
export function completeCounts(counts: { [Key in keyof GroupCounts]: number | null }): GroupCounts | null {
  const { for: inFavour, against, abstention, nonVoting } = counts;
  if (inFavour === null || against === null || abstention === null || nonVoting === null) return null;
  return { for: inFavour, against, abstention, nonVoting };
}

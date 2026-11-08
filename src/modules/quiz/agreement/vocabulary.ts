// How a score reads, without Drizzle so that the browser, which computes it, can use it.
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

export const noScoreLabel = "Pas de score";

export function formatScore(score: number | null): string {
  return score === null ? noScoreLabel : percent.format(score);
}

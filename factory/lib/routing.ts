import type { FactoryConfig, ReviewerName, Risk } from "./config.ts";

export type Routing = { reviewers: ReviewerName[]; risk: Risk };

export function routeChangedFiles(
  changedFiles: string[],
  rules: Pick<FactoryConfig, "alwaysReviewers" | "pathReviewers" | "riskByReviewer">,
): Routing {
  const reviewers = new Set<ReviewerName>(rules.alwaysReviewers);
  for (const [name, patterns] of Object.entries(rules.pathReviewers) as [ReviewerName, string[]][]) {
    if (changedFiles.some((file) => patterns.some((pattern) => matchesGlob(file, pattern)))) reviewers.add(name);
  }
  return { reviewers: [...reviewers], risk: riskOf([...reviewers], rules.riskByReviewer) };
}

// `**` crosses directories, `*` and `?` stay inside one path segment.
export function matchesGlob(path: string, pattern: string): boolean {
  return globToRegExp(pattern).test(path);
}

function riskOf(reviewers: ReviewerName[], riskByReviewer: Partial<Record<ReviewerName, Risk>>): Risk {
  const order: Risk[] = ["Faible", "Moyen", "Élevé"];
  const levels = reviewers.map((name) => order.indexOf(riskByReviewer[name] ?? "Faible"));
  return order[Math.max(0, ...levels)];
}

function globToRegExp(pattern: string): RegExp {
  let source = "";
  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      const followedBySlash = pattern[index + 2] === "/";
      source += followedBySlash ? "(?:.*/)?" : ".*";
      index += followedBySlash ? 2 : 1;
    } else if (character === "*") {
      source += "[^/]*";
    } else if (character === "?") {
      source += "[^/]";
    } else {
      source += character.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

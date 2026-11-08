import { MAX_COMPARED_CANDIDACIES } from "./vocabulary";

// What the comparator shows, as its URL holds it: candidacies in the order they were picked,
// and the slug of the topic, "" when none is given.
export type ComparisonSelection = { candidacyIds: string[]; topic: string };

export type ComparisonSearchParams = Record<string, string | string[] | undefined>;

export const comparisonPath = "/comparateur";

// French, since visitors read and share these URLs.
export const comparisonParamNames: Record<keyof ComparisonSelection, string> = {
  candidacyIds: "candidatures",
  topic: "thematique",
};

/**
 * Reads the URL of the comparator. Only published candidacies count, each once and at most
 * three, so a shared link shows the same comparison as long as they stay published.
 */
export function readComparison(
  searchParams: ComparisonSearchParams,
  publishedCandidacyIds: string[],
): ComparisonSelection {
  const raw = [searchParams[comparisonParamNames.candidacyIds] ?? []].flat();
  const candidacyIds = [...new Set(raw.flatMap((value) => value.split(",")))]
    .filter((id) => publishedCandidacyIds.includes(id))
    .slice(0, MAX_COMPARED_CANDIDACIES);
  return { candidacyIds, topic: [searchParams[comparisonParamNames.topic]].flat()[0] ?? "" };
}

export function comparisonHref({ candidacyIds, topic }: ComparisonSelection): string {
  const query = new URLSearchParams();
  if (candidacyIds.length > 0) query.set(comparisonParamNames.candidacyIds, candidacyIds.join(","));
  if (topic) query.set(comparisonParamNames.topic, topic);
  // The commas between ids stay readable in a shared link.
  const search = query.toString().replaceAll("%2C", ",");
  return search ? `${comparisonPath}?${search}` : comparisonPath;
}

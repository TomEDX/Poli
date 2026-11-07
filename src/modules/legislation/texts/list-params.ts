import type { TextNature } from "./vocabulary";
import type { TextFilters, TextTopic } from "./queries";

// The filters and sort of the public list as they read in its URL, "" when not picked.
export type TextListSelection = { topic: string; subtopic: string; nature: string; order: string };

export type TextListSearchParams = Record<string, string | string[] | undefined>;

export const textListPath = "/textes";

// French, since visitors read and share these URLs.
export const textListParamNames: Record<keyof TextListSelection, string> = {
  topic: "thematique",
  subtopic: "sous-thematique",
  nature: "nature",
  order: "tri",
};

export const natureParamValues: Record<TextNature, string> = {
  government_bill: "projet",
  member_bill: "proposition",
};

// The most recently filed first is the default, so it never shows in the URL.
export const oldestFirstParamValue = "ancien";

/**
 * Reads the URL of the public list. A value that matches nothing offered is dropped, so the
 * form always shows what the list was narrowed by. A subtopic slug is only unique within its
 * topic, so it counts only along with its topic.
 */
export function readTextList(
  searchParams: TextListSearchParams,
  topics: TextTopic[],
): { selection: TextListSelection; filters: TextFilters } {
  const selection: TextListSelection = { topic: "", subtopic: "", nature: "", order: "" };
  const filters: TextFilters = {};

  const topic = topics.find((candidate) => candidate.slug === param(searchParams, "topic"));
  if (topic) {
    selection.topic = topic.slug;
    filters.topicId = topic.id;
    const subtopic = topic.subtopics.find((candidate) => candidate.slug === param(searchParams, "subtopic"));
    if (subtopic) {
      selection.subtopic = subtopic.slug;
      filters.subtopicId = subtopic.id;
    }
  }

  const nature = (Object.keys(natureParamValues) as TextNature[]).find(
    (candidate) => natureParamValues[candidate] === param(searchParams, "nature"),
  );
  if (nature) {
    selection.nature = natureParamValues[nature];
    filters.nature = nature;
  }

  if (param(searchParams, "order") === oldestFirstParamValue) {
    selection.order = oldestFirstParamValue;
    filters.order = "oldest";
  }

  return { selection, filters };
}

export function textListHref(selection: TextListSelection): string {
  const query = new URLSearchParams();
  for (const key of Object.keys(textListParamNames) as (keyof TextListSelection)[]) {
    if (selection[key]) query.set(textListParamNames[key], selection[key]);
  }
  const search = query.toString();
  return search ? `${textListPath}?${search}` : textListPath;
}

function param(searchParams: TextListSearchParams, key: keyof TextListSelection): string | undefined {
  const value = searchParams[textListParamNames[key]];
  return Array.isArray(value) ? value[0] : value;
}

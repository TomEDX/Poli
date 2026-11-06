import { describe, expect, it } from "vitest";

import type { TopicTree } from "./topics";
import { visibleTree } from "./visible-tree";

const tree: TopicTree = [
  {
    id: "health",
    name: "Santé",
    slug: "sante",
    subtopics: [
      { id: "hospital", name: "Hôpital", slug: "hopital" },
      { id: "doctors", name: "Médecine de ville", slug: "medecine-de-ville" },
    ],
  },
  { id: "education", name: "Éducation", slug: "education", subtopics: [{ id: "school", name: "École", slug: "ecole" }] },
  { id: "work", name: "Travail", slug: "travail", subtopics: [] },
];

function names(query: string) {
  return visibleTree(tree, query).topics.map((topic) => [topic.name, topic.subtopics.map((subtopic) => subtopic.name)]);
}

describe("visible tree", () => {
  it("shows the whole tree, with each item's place among its siblings, when nothing is searched", () => {
    const visible = visibleTree(tree, "  ");

    expect(visible.searching).toBe(false);
    expect(visible.topics.map(({ name, isFirst, isLast }) => [name, isFirst, isLast])).toEqual([
      ["Santé", true, false],
      ["Éducation", false, false],
      ["Travail", false, true],
    ]);
    expect(visible.topics[0].subtopics.map(({ isFirst, isLast }) => [isFirst, isLast])).toEqual([
      [true, false],
      [false, true],
    ]);
  });

  it("keeps every subtopic of a matching topic, ignoring accents and case", () => {
    expect(names("SANTE")).toEqual([["Santé", ["Hôpital", "Médecine de ville"]]]);
  });

  it("shows only the matching subtopics under their topic, at their place in the whole tree", () => {
    const visible = visibleTree(tree, "medecine");

    expect(visible.searching).toBe(true);
    expect(names("medecine")).toEqual([["Santé", ["Médecine de ville"]]]);
    expect(visible.topics[0]).toMatchObject({ subtopicCount: 2, subtopics: [{ isFirst: false, isLast: true }] });
  });

  it("shows nothing when no name matches", () => {
    expect(names("retraites")).toEqual([]);
  });
});

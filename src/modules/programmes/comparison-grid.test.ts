import { GraduationCapIcon, TagIcon } from "lucide-react";
import { describe, expect, it } from "vitest";

import { extractCount, isAddressedByNone, topicIcon } from "./comparison-grid";
import type { ComparedExtract, ComparisonGrid } from "./queries";

type Topic = ComparisonGrid[number];
type Subtopic = Topic["subtopics"][number];

function extract(id: string): ComparedExtract {
  return { id, quote: "Une citation.", recordedOn: "2026-10-12", sources: [] };
}

function subtopic(id: string, extractsByCandidacy: Record<string, number>): Subtopic {
  return {
    id,
    name: id,
    cells: Object.entries(extractsByCandidacy).map(([candidacyId, count]) => ({
      candidacyId,
      extracts: Array.from({ length: count }, (_, index) => extract(`${id}-${candidacyId}-${index}`)),
    })),
  };
}

function topic(subtopics: Subtopic[]): Topic {
  return { id: "education", name: "Éducation", slug: "education", subtopics };
}

describe("the comparison grid as the comparator shows it", () => {
  it("counts the extracts of a topic, every chosen candidacy and subtopic together", () => {
    const education = topic([subtopic("ecole", { pdh: 2, udt: 1 }), subtopic("universite", { pdh: 0, udt: 3 })]);

    expect(extractCount(education)).toBe(6);
  });

  it("counts no extract in a topic none of the chosen candidacies addresses", () => {
    expect(extractCount(topic([subtopic("ecole", { pdh: 0, udt: 0 })]))).toBe(0);
  });

  it("tells a subtopic addressed by none of the chosen candidacies", () => {
    expect(isAddressedByNone(subtopic("ecole", { pdh: 0, udt: 0, mes: 0 }))).toBe(true);
  });

  it("tells a subtopic addressed by a single chosen candidacy", () => {
    expect(isAddressedByNone(subtopic("ecole", { pdh: 0, udt: 1, mes: 0 }))).toBe(false);
  });

  it("gives a known topic its own icon, and an unknown topic a neutral one", () => {
    expect(topicIcon("education")).toBe(GraduationCapIcon);
    expect(topicIcon("a-topic-added-later")).toBe(TagIcon);
  });
});

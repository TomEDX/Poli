import { describe, expect, it } from "vitest";

import { comparisonHref, readComparison } from "./comparison-params";

const published = ["pdh", "udt", "mes", "ac"];

function read(href: string) {
  const searchParams = Object.fromEntries(new URL(href, "https://poli.example").searchParams);
  return readComparison(searchParams, published);
}

describe("the comparator's link", () => {
  it("gives back the same candidacies, in the same order, and the same topic", () => {
    const selection = { candidacyIds: ["mes", "pdh", "udt"], topic: "education" };

    const href = comparisonHref(selection);

    expect(href).toBe("/comparateur?candidatures=mes,pdh,udt&thematique=education");
    expect(read(href)).toEqual(selection);
  });

  it("never holds more than three candidacies", () => {
    expect(read("/comparateur?candidatures=pdh,udt,mes,ac").candidacyIds).toEqual(["pdh", "udt", "mes"]);
  });

  it("drops a candidacy that is not published, or given twice", () => {
    expect(read("/comparateur?candidatures=draft,pdh,pdh,udt").candidacyIds).toEqual(["pdh", "udt"]);
  });

  it("is empty without parameters", () => {
    expect(read("/comparateur")).toEqual({ candidacyIds: [], topic: "" });
    expect(comparisonHref({ candidacyIds: [], topic: "" })).toBe("/comparateur");
  });
});

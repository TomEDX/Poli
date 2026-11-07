import { describe, expect, it } from "vitest";

import { newTextSchema, textChangesSchema } from "./validation";

const subtopicId = "6f1c1f3e-8f4e-4a0e-9d57-3b1d3c5a9e10";

const newText = {
  nature: "government_bill",
  number: "123",
  officialTitle: "Projet de loi",
  filedOn: "2026-01-15",
  officialUrl: null,
  summary: "Le texte réforme le marché de l'énergie.",
  subtopicIds: [subtopicId],
};

describe("the official title of a new text", () => {
  const parse = (officialTitle: string) => newTextSchema.safeParse({ ...newText, officialTitle });

  it("collapses the repeated spaces inside the title", () => {
    expect(parse("Projet  de loi   relatif à l'énergie").data?.officialTitle).toBe("Projet de loi relatif à l'énergie");
  });

  it("refuses a title made only of spaces with the existing message", () => {
    const result = parse("     ");

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Saisissez le titre officiel.");
  });
});

describe("the official title in text changes", () => {
  const parse = (officialTitle: string) => textChangesSchema.safeParse({ officialTitle });

  it("collapses the repeated spaces inside the title", () => {
    expect(parse("  Projet  de loi   relatif à l'énergie ").data).toEqual({
      officialTitle: "Projet de loi relatif à l'énergie",
    });
  });

  it("refuses a title made only of spaces with the existing message", () => {
    const result = parse("     ");

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Saisissez le titre officiel.");
  });
});

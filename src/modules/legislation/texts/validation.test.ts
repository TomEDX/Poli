import { describe, expect, it } from "vitest";

import { newTextSchema, textChangesSchema } from "./validation";

const typedTitle = " Projet  de loi   relatif à l'énergie ";
const savedTitle = "Projet de loi relatif à l'énergie";

describe("the official title of a text", () => {
  const createWith = (officialTitle: string) =>
    newTextSchema.safeParse({
      nature: "government_bill",
      number: "412",
      officialTitle,
      filedOn: "2026-10-03",
      officialUrl: "",
      summary: "Le texte réforme le marché de l'électricité.",
    });
  const editWith = (officialTitle: string) => textChangesSchema.safeParse({ officialTitle });

  it("collapses inner runs of spaces into one when a text is created", () => {
    expect(createWith(typedTitle).data?.officialTitle).toBe(savedTitle);
  });

  it("collapses inner runs of spaces into one when a text is edited", () => {
    expect(editWith(typedTitle).data).toEqual({ officialTitle: savedTitle });
  });

  it("still refuses a title made only of spaces", () => {
    expect(createWith("    ").error?.issues[0].message).toBe("Saisissez le titre officiel.");
    expect(editWith("    ").error?.issues[0].message).toBe("Saisissez le titre officiel.");
  });
});

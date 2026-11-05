import { describe, expect, it } from "vitest";

import { topicFormSchema } from "./validation";

const parse = (name: string, slug = "") => topicFormSchema.safeParse({ name, slug });

describe("topic form", () => {
  it("derives the slug from the name when it is left empty", () => {
    expect(parse("  Écologie & cœur de l'État  ").data).toEqual({
      name: "Écologie & cœur de l'État",
      slug: "ecologie-coeur-de-l-etat",
    });
  });

  it("keeps a slug typed by the editor once normalised", () => {
    expect(parse("Santé", " Santé-Publique ").data).toEqual({ name: "Santé", slug: "sante-publique" });
  });

  it("refuses an empty name or a name without any letter or digit", () => {
    expect(parse("   ").success).toBe(false);
    expect(parse("—").success).toBe(false);
  });
});

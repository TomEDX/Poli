import { describe, expect, it } from "vitest";

import { newTopicSchema, topicChangesSchema } from "../validation";

describe("a new topic", () => {
  const parse = (name: string, slug = "") => newTopicSchema.safeParse({ name, slug });

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
    expect(parse("—", "sante").success).toBe(false);
  });
});

describe("topic changes", () => {
  const parse = (changes: object) => topicChangesSchema.safeParse(changes);

  it("keep only the field the editor changed", () => {
    expect(parse({ name: " Santé publique " }).data).toEqual({ name: "Santé publique" });
    expect(parse({ slug: "Santé Publique" }).data).toEqual({ slug: "sante-publique" });
  });

  it("refuse an emptied slug instead of rebuilding it", () => {
    expect(parse({ slug: "  " }).error?.issues[0].message).toBe(
      "Saisissez un identifiant avec au moins une lettre ou un chiffre.",
    );
  });

  it("refuse an edit that changes nothing", () => {
    expect(parse({}).success).toBe(false);
  });
});

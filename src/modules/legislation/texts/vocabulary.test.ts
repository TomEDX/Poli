import { describe, expect, it } from "vitest";

import { publishedTextCountLabel } from "./vocabulary";

describe("the count of published texts", () => {
  it("reads in French, singular and plural", () => {
    expect(publishedTextCountLabel(3)).toBe("3 textes examinés");
    expect(publishedTextCountLabel(1)).toBe("1 texte examiné");
  });

  it("says when no text is published yet", () => {
    expect(publishedTextCountLabel(0)).toBe("Aucun texte publié pour l’instant");
  });
});

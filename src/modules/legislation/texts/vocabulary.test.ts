import { describe, expect, it } from "vitest";

import { publishedTextCountLabel } from "./vocabulary";

describe("the published text count label", () => {
  it("is plural from two texts", () => {
    expect(publishedTextCountLabel(3)).toBe("3 textes examinés");
  });

  it("is singular for one text", () => {
    expect(publishedTextCountLabel(1)).toBe("1 texte examiné");
  });

  it("says nothing is published yet when there is no text", () => {
    expect(publishedTextCountLabel(0)).toBe("Aucun texte publié pour l'instant");
  });
});

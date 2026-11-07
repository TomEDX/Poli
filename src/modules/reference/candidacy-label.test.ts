import { describe, expect, it } from "vitest";

import { candidacyLabel } from "./candidacy-label";

const party = { name: "Parti de l'Horizon", abbreviation: "PDH" };

describe("candidacy label", () => {
  it("names the candidate followed by the party abbreviation once a candidate is declared", () => {
    expect(candidacyLabel({ candidateName: "Camille Martin", party })).toBe("Camille Martin (PDH)");
  });

  it("is the party name alone while no candidate is declared", () => {
    expect(candidacyLabel({ candidateName: null, party })).toBe("Parti de l'Horizon");
  });
});

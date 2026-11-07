import { describe, expect, it } from "vitest";

import { hasRoundLeft, isLegalTransition } from "./transitions.ts";

describe("isLegalTransition", () => {
  it("follows the pipeline ready, build, gate, review, to-validate", () => {
    expect(isLegalTransition("ready", "build")).toBe(true);
    expect(isLegalTransition("build", "gate")).toBe(true);
    expect(isLegalTransition("gate", "review")).toBe(true);
    expect(isLegalTransition("review", "to-validate")).toBe(true);
  });

  it("refuses to skip the gate or the reviews", () => {
    expect(isLegalTransition("build", "review")).toBe(false);
    expect(isLegalTransition("build", "to-validate")).toBe(false);
    expect(isLegalTransition("gate", "to-validate")).toBe(false);
    expect(isLegalTransition("ready", "review")).toBe(false);
  });

  it("sends a failed gate or review back to build", () => {
    expect(isLegalTransition("gate", "build")).toBe(true);
    expect(isLegalTransition("review", "build")).toBe(true);
  });

  it("lets any unfinished job end as merged or closed, and nothing leave an ended job", () => {
    expect(isLegalTransition("to-validate", "merged")).toBe(true);
    expect(isLegalTransition("needs-human", "closed")).toBe(true);
    expect(isLegalTransition("merged", "build")).toBe(false);
    expect(isLegalTransition("closed", "merged")).toBe(false);
  });
});

describe("hasRoundLeft", () => {
  it("allows another round until the limit is reached", () => {
    expect(hasRoundLeft(2, 3)).toBe(true);
    expect(hasRoundLeft(3, 3)).toBe(false);
  });
});

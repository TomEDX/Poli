import { describe, expect, it } from "vitest";

import { mustConfirmLeaving } from "./leaving";

describe("leaving the quiz", () => {
  it("needs no confirmation before the first answer", () => {
    expect(mustConfirmLeaving({ answered: 0, showingResults: false })).toBe(false);
  });

  it("asks for confirmation once a question is answered", () => {
    expect(mustConfirmLeaving({ answered: 1, showingResults: false })).toBe(true);
  });

  it("needs no confirmation while the results are shown", () => {
    expect(mustConfirmLeaving({ answered: 12, showingResults: true })).toBe(false);
  });
});

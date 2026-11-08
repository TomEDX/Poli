import { describe, expect, it } from "vitest";

import { shuffled } from "./shuffle";

// The same sequence of draws on every run, so the test never depends on chance.
function draws(...values: number[]) {
  let next = 0;
  return () => values[next++ % values.length];
}

describe("shuffled", () => {
  it("gives a different order for different draws, always with every item once", () => {
    const items = ["PDH", "UDT", "MES"];

    const first = shuffled(items, draws(0));
    const second = shuffled(items, draws(0.99));

    expect(first).not.toEqual(second);
    expect([...first].sort()).toEqual([...items].sort());
    expect([...second].sort()).toEqual([...items].sort());
    expect(items).toEqual(["PDH", "UDT", "MES"]);
  });

  it("can give every order", () => {
    const seen = new Set<string>();
    for (const first of [0, 0.4, 0.8]) {
      for (const second of [0, 0.6]) seen.add(shuffled(["a", "b", "c"], draws(first, second)).join(""));
    }

    expect(seen.size).toBe(6);
  });
});

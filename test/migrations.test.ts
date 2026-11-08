import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const MIGRATIONS_FOLDER = "drizzle";

// Two branches that each add the next migration number merge without a git conflict when their
// file names differ: these tests catch it once both reach the same branch.
describe("migrations", () => {
  it("gives each migration its own number", () => {
    const numbers = migrationNames().map((name) => name.split("_")[0]);

    expect(numbers.filter((number, index) => numbers.indexOf(number) !== index)).toEqual([]);
  });

  it("lists each migration once in the journal", () => {
    expect(journalTags().sort()).toEqual(migrationNames().sort());
  });
});

function migrationNames(): string[] {
  return readdirSync(MIGRATIONS_FOLDER)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => file.replace(/\.sql$/, ""));
}

function journalTags(): string[] {
  const journal: { entries: { tag: string }[] } = JSON.parse(
    readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf8"),
  );
  return journal.entries.map((entry) => entry.tag);
}

import { describe, expect, it } from "vitest";

import { findMigrationProblems } from "./migrations.ts";

describe("findMigrationProblems", () => {
  it("accepts unique numbers that match the journal", () => {
    expect(
      findMigrationProblems({ sqlFiles: ["0001_a.sql", "0002_b.sql"], journalTags: ["0001_a", "0002_b"] }),
    ).toEqual([]);
  });

  it("reports two migrations sharing a number, as happens when two branches add the next one", () => {
    const problems = findMigrationProblems({
      sqlFiles: ["0001_a.sql", "0002_b.sql", "0002_c.sql"],
      journalTags: ["0001_a", "0002_b", "0002_c"],
    });
    expect(problems).toEqual(["Migration number 0002 is used by 0002_b.sql and 0002_c.sql."]);
  });

  it("reports a file the journal does not know and a journal entry without a file", () => {
    const problems = findMigrationProblems({ sqlFiles: ["0001_a.sql", "0002_b.sql"], journalTags: ["0001_a", "0003_c"] });
    expect(problems).toContain("meta/_journal.json lists 0003_c, which has no .sql file.");
    expect(problems).toContain("0002_b.sql is missing from meta/_journal.json.");
  });
});

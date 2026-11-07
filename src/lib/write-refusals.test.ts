import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "./db";
import { Refused, refusalOf } from "./write-refusals";

describe("refusalOf", () => {
  it("reads a broken unique constraint as the reason it stands for", async () => {
    await insertTopic("sante");
    const error = await failure(insertTopic("sante"));
    expect(refusalOf(error, { taken: { topics_slug_unique: "slug-taken" } })).toBe("slug-taken");
  });

  it("reads a broken foreign key as the reason the caller gives it", async () => {
    const error = await failure(
      db.execute(sql`insert into subtopics (topic_id, name, slug, position)
                      values (gen_random_uuid(), 'Prévention', 'prevention', 1)`),
    );
    expect(refusalOf(error, { foreignKey: "not-found" })).toBe("not-found");
    expect(refusalOf(error, { foreignKey: "in-use" })).toBe("in-use");
  });

  it("returns the reason a write was refused with", () => {
    expect(refusalOf(new Refused("no-subtopic"), {})).toBe("no-subtopic");
  });

  it("rethrows an error it has no reason for", async () => {
    await insertTopic("sante");
    const error = await failure(insertTopic("sante"));
    expect(() => refusalOf(error, { foreignKey: "not-found" })).toThrow(error as Error);
    expect(() => refusalOf(new Error("connection lost"), { foreignKey: "not-found" })).toThrow("connection lost");
  });
});

function insertTopic(slug: string) {
  return db.execute(sql`insert into topics (name, slug, position) values ('Santé', ${slug}, 1)`);
}

async function failure(write: Promise<unknown>): Promise<unknown> {
  try {
    await write;
  } catch (error) {
    return error;
  }
  throw new Error("The write succeeded.");
}

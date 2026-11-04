import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { topics } from "@/modules/reference/schema";

describe("test database", () => {
  // Both tests insert the same unique slug, so the second one only passes if
  // the database was reset in between.
  async function insertThenRead() {
    await db.insert(topics).values({ name: "Santé", slug: "sante", position: 1 });
    return db.select().from(topics);
  }

  it("writes and reads back a topic", async () => {
    const rows = await insertThenRead();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Santé", slug: "sante", position: 1 });
  });

  it("starts each test from an empty database", async () => {
    const rows = await insertThenRead();

    expect(rows).toHaveLength(1);
  });
});

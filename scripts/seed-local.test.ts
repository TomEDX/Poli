import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { createTopic, getTopicTree } from "@/modules/reference/topics";

import { seedLocalDatabase } from "./seed-local";

describe("local seed", () => {
  it("fills an empty database with a topic tree", async () => {
    expect(await seedLocalDatabase(db.$client)).toBe(true);

    const tree = await getTopicTree();
    expect(tree.length).toBeGreaterThan(5);
    expect(tree[0]).toMatchObject({ name: "Économie et emploi", slug: "economie-et-emploi" });
    expect(tree.every((topic) => topic.subtopics.length >= 2)).toBe(true);
  });

  it("leaves a database that already has topics untouched", async () => {
    await createTopic({ name: "Santé", slug: "sante" });

    expect(await seedLocalDatabase(db.$client)).toBe(false);
    expect(await getTopicTree()).toMatchObject([{ name: "Santé", subtopics: [] }]);
  });
});

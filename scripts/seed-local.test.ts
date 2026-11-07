import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { getPublishedCandidacies } from "@/modules/reference/candidacies";
import { createParty, getParties } from "@/modules/reference/parties";
import { createTopic, getTopicTree } from "@/modules/reference/topics";

import { seedLocalDatabase } from "./seed-local";

describe("local seed", () => {
  it("fills an empty database with a topic tree", async () => {
    expect(await seedLocalDatabase(db.$client)).toMatchObject({ topics: true });

    const tree = await getTopicTree();
    expect(tree.length).toBeGreaterThan(5);
    expect(tree[0]).toMatchObject({ name: "Économie et emploi", slug: "economie-et-emploi" });
    expect(tree.every((topic) => topic.subtopics.length >= 2)).toBe(true);
  });

  it("leaves a database that already has topics untouched", async () => {
    await createTopic({ name: "Santé", slug: "sante" });

    expect(await seedLocalDatabase(db.$client)).toMatchObject({ topics: false });
    expect(await getTopicTree()).toMatchObject([{ name: "Santé", subtopics: [] }]);
  });

  it("adds parties and candidacies of every kind: with or without candidate, draft or published", async () => {
    expect(await seedLocalDatabase(db.$client)).toMatchObject({ parties: true });

    const candidacies = (await getParties()).flatMap((party) => (party.candidacy ? [party.candidacy] : []));
    expect(candidacies.length).toBeGreaterThan(3);
    expect(candidacies.some((candidacy) => candidacy.candidateName === null)).toBe(true);
    expect(candidacies.some((candidacy) => candidacy.status === "draft")).toBe(true);
    expect(await getPublishedCandidacies()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ candidateName: null }),
        expect.objectContaining({ candidateName: expect.any(String) }),
      ]),
    );
  });

  it("leaves the parties of a database that already has some untouched", async () => {
    await createParty({ name: "Parti de test", abbreviation: "PDT" });

    expect(await seedLocalDatabase(db.$client)).toEqual({ topics: true, parties: false });
    expect(await getParties()).toMatchObject([{ name: "Parti de test", candidacy: null }]);
  });
});

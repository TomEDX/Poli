import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { createText, getPublishedTexts, getTexts } from "@/modules/legislation/texts";
import { getPublishedCandidacies } from "@/modules/reference/candidacies";
import { createParliamentaryGroup, getParliamentaryGroups } from "@/modules/reference/parliamentary-groups";
import { createParty, getParties } from "@/modules/reference/parties";
import { createSource, getSources } from "@/modules/reference/sources";
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

    expect(await seedLocalDatabase(db.$client)).toMatchObject({ topics: true, parties: false });
    expect(await getParties()).toMatchObject([{ name: "Parti de test", candidacy: null }]);
  });

  it("adds parliamentary groups, linked to one party, several or none", async () => {
    expect(await seedLocalDatabase(db.$client)).toMatchObject({ parliamentaryGroups: true });

    const groups = await getParliamentaryGroups();
    expect(groups.length).toBeGreaterThan(3);
    expect(groups.some((group) => group.parties.length === 0)).toBe(true);
    expect(groups.some((group) => group.parties.length === 1)).toBe(true);
    expect(groups.some((group) => group.parties.length > 1)).toBe(true);
  });

  it("leaves the groups of a database that already has some untouched", async () => {
    await createParliamentaryGroup({ name: "Groupe de test", abbreviation: "GDT", partyIds: [] });

    expect(await seedLocalDatabase(db.$client)).toEqual({
      topics: true,
      parties: true,
      parliamentaryGroups: false,
      sources: true,
      texts: true,
    });
    expect(await getParliamentaryGroups()).toMatchObject([{ name: "Groupe de test", parties: [] }]);
  });

  it("adds sources of every type", async () => {
    expect(await seedLocalDatabase(db.$client)).toMatchObject({ sources: true });

    const kinds = new Set((await getSources()).map((source) => source.kind));
    expect([...kinds].sort()).toEqual(["official_text", "other", "program", "vote"]);
  });

  it("leaves the sources of a database that already has some untouched", async () => {
    await createSource({
      title: "Source de test",
      organization: "Poli.",
      url: "https://example.org",
      consultedOn: "2026-11-01",
      kind: "other",
    });

    expect(await seedLocalDatabase(db.$client)).toMatchObject({ sources: false });
    expect(await getSources()).toMatchObject([{ title: "Source de test" }]);
  });

  it("adds texts of both natures, drafts and published ones, filed under the seeded subtopics", async () => {
    expect(await seedLocalDatabase(db.$client)).toMatchObject({ texts: true });

    const texts = await getTexts();
    expect(new Set(texts.map((text) => text.nature))).toEqual(new Set(["government_bill", "member_bill"]));
    expect(texts.some((text) => text.status === "draft")).toBe(true);
    expect(texts.some((text) => text.officialUrl === null)).toBe(true);
    const published = await getPublishedTexts();
    expect(published.length).toBeGreaterThan(2);
    expect(published.every((text) => text.subtopics.length > 0)).toBe(true);
  });

  it("leaves the texts of a database that already has some untouched", async () => {
    await createText({
      nature: "member_bill",
      number: 1,
      officialTitle: "Texte de test",
      filedOn: "2026-11-01",
      officialUrl: null,
      summary: "Résumé de test",
      subtopicIds: [],
    });

    expect(await seedLocalDatabase(db.$client)).toMatchObject({ texts: false });
    expect(await getTexts()).toMatchObject([{ officialTitle: "Texte de test" }]);
  });
});

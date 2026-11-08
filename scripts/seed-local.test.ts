import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { getPublishedAmendments } from "@/modules/legislation/amendments/queries";
import { createText, getPublishedText, getPublishedTexts, getTexts } from "@/modules/legislation/texts/queries";
import { getPublishedVotes } from "@/modules/legislation/votes/queries";
import { getExtracts, getPublishedProgramme, getSubtopicsWithoutExtract } from "@/modules/programmes/queries";
import { getMissingPositions } from "@/modules/quiz/positions/queries";
import { getPublishedQuiz, getQuestions } from "@/modules/quiz/questions/queries";
import { createParty, getParties, getPublishedCandidacies } from "@/modules/reference/parties/queries";
import { createParliamentaryGroup, getParliamentaryGroups } from "@/modules/reference/parliamentary-groups/queries";
import { createSource, getSources } from "@/modules/reference/sources/queries";
import { createTopic, getTopicTree } from "@/modules/reference/topics/queries";

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
      votes: true,
      amendments: true,
      extracts: true,
      questions: true,
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

  it("adds a scrutin on the whole of a published text, with a vote for every group, counted or not", async () => {
    expect(await seedLocalDatabase(db.$client)).toMatchObject({ votes: true });

    const groups = await getParliamentaryGroups();
    const votes = (await Promise.all((await getPublishedTexts()).map((text) => getPublishedVotes(text.id)))).flat();
    const finalVotes = votes.filter((vote) => vote.subject === "whole_text");
    expect(finalVotes).toHaveLength(1);
    const [vote] = finalVotes;
    expect(vote.groupVotes.map((groupVote) => groupVote.group.id)).toEqual(groups.map((group) => group.id));
    expect(vote.groupVotes.some((groupVote) => groupVote.counts === null)).toBe(true);
    expect(vote.groupVotes.some((groupVote) => groupVote.counts !== null)).toBe(true);
  });

  it("links a published text and its scrutin to seeded sources, and leaves other texts without", async () => {
    await seedLocalDatabase(db.$client);

    const texts = await Promise.all((await getPublishedTexts()).map((text) => getPublishedText(text.id)));
    expect(texts.some((text) => text && text.sources.length > 0)).toBe(true);
    expect(texts.some((text) => text && text.sources.length === 0)).toBe(true);
    const votes = (await Promise.all(texts.map((text) => (text ? getPublishedVotes(text.id) : [])))).flat();
    expect(votes.some((vote) => vote.sources.length > 0)).toBe(true);
  });

  it("adds published amendments to a published text, one with a public scrutin, one voted by show of hands", async () => {
    expect(await seedLocalDatabase(db.$client)).toMatchObject({ amendments: true });

    const texts = await getPublishedTexts();
    const amendments = (await Promise.all(texts.map((text) => getPublishedAmendments(text.id)))).flat();
    expect(amendments.some((amendment) => amendment.vote !== null && amendment.vote.groupVotes.length > 0)).toBe(true);
    expect(
      amendments.some((amendment) => amendment.vote === null && ["adopted", "rejected"].includes(amendment.fate)),
    ).toBe(true);
    expect(amendments.some((amendment) => amendment.authorGroup !== null)).toBe(true);
  });

  it("adds programme extracts to published candidacies, some sourced, some drafts, leaving subtopics to read", async () => {
    expect(await seedLocalDatabase(db.$client)).toMatchObject({ extracts: true });

    const candidacies = await getPublishedCandidacies();
    const programmes = await Promise.all(candidacies.map((candidacy) => getPublishedProgramme(candidacy.id)));
    expect(programmes.filter((programme) => programme.length > 0).length).toBeGreaterThan(1);
    expect(programmes.flat().some((extract) => extract.sources.length > 0)).toBe(true);
    const extracts = (await Promise.all(candidacies.map((candidacy) => getExtracts(candidacy.id)))).flat();
    expect(extracts.some((extract) => extract.status === "draft")).toBe(true);
    expect(await getSubtopicsWithoutExtract(candidacies[0].id)).not.toEqual([]);
  });

  it("adds quiz questions with positions, some sourced, some missing, and a draft question", async () => {
    expect(await seedLocalDatabase(db.$client)).toMatchObject({ questions: true });

    const positions = (await getPublishedQuiz()).flatMap((question) => question.positions);
    expect(positions.some((position) => position.value === null)).toBe(true);
    expect(positions.some((position) => position.source !== null)).toBe(true);
    expect((await getQuestions()).some((question) => question.status === "draft")).toBe(true);
    expect(await getMissingPositions()).not.toEqual([]);
  });
});

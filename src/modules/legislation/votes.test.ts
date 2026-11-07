import { describe, expect, it } from "vitest";

import { createParliamentaryGroup, removeParliamentaryGroup } from "@/modules/reference/parliamentary-groups";
import { createSubtopic, createTopic } from "@/modules/reference/topics";

import { createAmendment, getAmendments, removeAmendment } from "./amendments";
import { createText, saveText } from "./texts";
import { createVote, getPublishedVotes, getVotes, removeVote, saveVote, type VoteInput } from "./votes";

const finalVote = {
  subject: "whole_text",
  number: 412,
  heldOn: "2026-09-30",
  result: "adopted",
  officialUrl: "https://assemblee.example.org/scrutins/412",
  amendmentId: null,
} as const;

async function publishedTextId() {
  const topic = await createTopic({ name: "Écologie", slug: "ecologie" });
  if (!topic.ok) throw new Error("Could not create Écologie");
  const subtopic = await createSubtopic(topic.id, { name: "Énergie", slug: "energie" });
  if (!subtopic.ok) throw new Error("Could not create Énergie");
  const text = await createText({
    nature: "government_bill",
    number: 105,
    officialTitle: "Projet de loi relatif aux énergies renouvelables",
    filedOn: "2026-09-12",
    officialUrl: null,
    summary: "Le texte simplifie les procédures.",
    subtopicIds: [subtopic.id],
    status: "published",
  });
  if (!text.ok) throw new Error("Could not create the text");
  return text.id;
}

// Created in the official order given.
async function groupIds(...abbreviations: string[]) {
  const ids: string[] = [];
  for (const abbreviation of abbreviations) {
    const group = await createParliamentaryGroup({ name: `Groupe ${abbreviation}`, abbreviation, partyIds: [] });
    if (!group.ok) throw new Error(`Could not create ${abbreviation}`);
    ids.push(group.id);
  }
  return ids;
}

describe("a scrutin on a published text", () => {
  it("shows with each group's majority position and count, groups in the official order", async () => {
    const textId = await publishedTextId();
    const [left, centre, right] = await groupIds("GAU", "CEN", "DRO");

    const created = await createVote(textId, {
      ...finalVote,
      groupVotes: [
        { groupId: right, position: "against", counts: null },
        { groupId: left, position: "for", counts: { for: 30, against: 2, abstention: 1, nonVoting: 0 } },
        { groupId: centre, position: "abstention", counts: null },
      ],
    });

    expect(created).toEqual({ ok: true, id: expect.any(String) });
    expect(await getPublishedVotes(textId)).toEqual([
      {
        ...finalVote,
        id: expect.any(String),
        groupVotes: [
          {
            group: { id: left, name: "Groupe GAU", abbreviation: "GAU" },
            position: "for",
            counts: { for: 30, against: 2, abstention: 1, nonVoting: 0 },
          },
          { group: { id: centre, name: "Groupe CEN", abbreviation: "CEN" }, position: "abstention", counts: null },
          { group: { id: right, name: "Groupe DRO", abbreviation: "DRO" }, position: "against", counts: null },
        ],
      },
    ]);
  });

  it("come with the vote on the whole text first, then the others by date", async () => {
    const textId = await publishedTextId();
    await createVote(textId, { ...finalVote, number: 420, heldOn: "2026-10-02", groupVotes: [] });
    await createVote(textId, { ...finalVote, subject: "motion", number: 405, heldOn: "2026-09-28", groupVotes: [] });
    await createVote(textId, { ...finalVote, subject: "article", number: 401, heldOn: "2026-09-29", groupVotes: [] });

    expect((await getPublishedVotes(textId)).map((vote) => [vote.subject, vote.number])).toEqual([
      ["whole_text", 420],
      ["motion", 405],
      ["article", 401],
    ]);
  });

  it("are hidden while their text is a draft", async () => {
    const textId = await publishedTextId();
    await createVote(textId, { ...finalVote, groupVotes: [] });

    await saveText(textId, { status: "draft" });

    expect(await getPublishedVotes(textId)).toEqual([]);
    expect(await getPublishedVotes("scrutin-412")).toEqual([]);
  });
});

describe("entering a scrutin", () => {
  it("takes one vote per group: a group given twice is refused and nothing is written", async () => {
    const textId = await publishedTextId();
    const [left, right] = await groupIds("GAU", "DRO");

    const twice = await createVote(textId, {
      ...finalVote,
      groupVotes: [
        { groupId: left, position: "for", counts: null },
        { groupId: right, position: "against", counts: null },
        { groupId: left, position: "against", counts: null },
      ],
    });

    expect(twice).toEqual({ ok: false, reason: "group-voted-twice" });
    expect(await getPublishedVotes(textId)).toEqual([]);
  });

  it("refuses a number another scrutin of the text already has", async () => {
    const textId = await publishedTextId();
    await createVote(textId, { ...finalVote, groupVotes: [] });

    expect(await createVote(textId, { ...finalVote, subject: "motion", groupVotes: [] })).toEqual({
      ok: false,
      reason: "number-taken",
    });
    expect(await getPublishedVotes(textId)).toMatchObject([{ subject: "whole_text" }]);
  });

  it("reports a text or a group deleted meanwhile", async () => {
    const textId = await publishedTextId();
    const gone = "00000000-0000-4000-8000-000000000000";

    expect(await createVote(gone, { ...finalVote, groupVotes: [] })).toEqual({ ok: false, reason: "not-found" });
    expect(
      await createVote(textId, { ...finalVote, groupVotes: [{ groupId: gone, position: "for", counts: null }] }),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(await getPublishedVotes(textId)).toEqual([]);
  });
});

describe("scrutins in the administration", () => {
  it("are listed for a draft text too, with what the form edits", async () => {
    const textId = await publishedTextId();
    await saveText(textId, { status: "draft" });
    const [left, right] = await groupIds("GAU", "DRO");
    const groupVotes = [
      { groupId: left, position: "for", counts: { for: 30, against: 2, abstention: 1, nonVoting: 0 } },
      { groupId: right, position: "against", counts: null },
    ] as const;
    const created = await createVote(textId, { ...finalVote, groupVotes: [groupVotes[1], groupVotes[0]] });

    expect(await getVotes(textId)).toEqual([{ ...finalVote, id: created.ok && created.id, groupVotes }]);
  });

  it("are saved again with every group vote in one write", async () => {
    const textId = await publishedTextId();
    const [left, centre, right] = await groupIds("GAU", "CEN", "DRO");
    const created = await createVote(textId, {
      ...finalVote,
      groupVotes: [
        { groupId: left, position: "for", counts: null },
        { groupId: right, position: "against", counts: null },
      ],
    });
    if (!created.ok) throw new Error("Could not create the scrutin");

    const edited: VoteInput = {
      ...finalVote,
      result: "rejected",
      officialUrl: null,
      groupVotes: [
        { groupId: centre, position: "abstention", counts: { for: 0, against: 1, abstention: 12, nonVoting: 1 } },
        { groupId: right, position: "for", counts: null },
      ],
    };
    expect(await saveVote(created.id, edited)).toEqual({ ok: true });
    expect(await getVotes(textId)).toEqual([{ ...edited, id: created.id }]);

    const twice: VoteInput = { ...edited, result: "adopted", groupVotes: [...edited.groupVotes, edited.groupVotes[1]] };
    expect(await saveVote(created.id, twice)).toEqual({ ok: false, reason: "group-voted-twice" });
    expect(await getVotes(textId)).toEqual([{ ...edited, id: created.id }]);
  });

  it("are deleted, and a scrutin deleted meanwhile is reported", async () => {
    const textId = await publishedTextId();
    const created = await createVote(textId, { ...finalVote, groupVotes: [] });
    if (!created.ok) throw new Error("Could not create the scrutin");

    expect(await removeVote(created.id)).toEqual({ ok: true });
    expect(await getVotes(textId)).toEqual([]);
    expect(await removeVote(created.id)).toEqual({ ok: false, reason: "not-found" });
    expect(await saveVote(created.id, { ...finalVote, groupVotes: [] })).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("a scrutin on an amendment", () => {
  const amendmentVote = { ...finalVote, subject: "amendment" as const, number: 398, groupVotes: [] };

  async function amendmentId(textId: string, number = 12) {
    const created = await createAmendment(textId, {
      number,
      authorLabel: "Mme Claire Martin",
      authorGroupId: null,
      cosignatories: null,
      summary: "L’amendement réserve les ombrières aux grands parkings.",
      fate: "adopted",
      governmentOpinion: "none",
      committeeOpinion: "none",
      status: "published",
    });
    if (!created.ok) throw new Error("Could not create the amendment");
    return created.id;
  }

  it("is linked to its amendment, which keeps a single scrutin", async () => {
    const textId = await publishedTextId();
    const amendment = await amendmentId(textId);

    const created = await createVote(textId, { ...amendmentVote, amendmentId: amendment });

    expect(created).toEqual({ ok: true, id: expect.any(String) });
    expect(await getVotes(textId)).toMatchObject([{ number: 398, amendmentId: amendment }]);
    expect(await createVote(textId, { ...amendmentVote, number: 399, amendmentId: amendment })).toEqual({
      ok: false,
      reason: "amendment-voted-twice",
    });

    const other = await createVote(textId, { ...amendmentVote, number: 399, amendmentId: null });
    if (!other.ok) throw new Error("Could not create the scrutin");
    expect(await saveVote(other.id, { ...amendmentVote, number: 399, amendmentId: amendment })).toEqual({
      ok: false,
      reason: "amendment-voted-twice",
    });
  });

  it("cannot be linked to an amendment of another text", async () => {
    const textId = await publishedTextId();
    const amendment = await amendmentId(textId);
    const otherText = await createText({
      nature: "member_bill",
      number: 230,
      officialTitle: "Proposition de loi visant à renforcer la prévention en santé",
      filedOn: "2026-10-03",
      officialUrl: null,
      summary: "Le texte crée un rendez-vous de prévention.",
      subtopicIds: [],
    });
    if (!otherText.ok) throw new Error("Could not create the text");

    expect(await createVote(otherText.id, { ...amendmentVote, amendmentId: amendment })).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(await getVotes(otherText.id)).toEqual([]);
  });

  it("stays when its amendment is deleted, linked to nothing", async () => {
    const textId = await publishedTextId();
    const amendment = await amendmentId(textId);
    await createVote(textId, { ...amendmentVote, amendmentId: amendment });

    await removeAmendment(amendment);

    expect(await getAmendments(textId)).toEqual([]);
    expect(await getVotes(textId)).toMatchObject([{ number: 398, amendmentId: null }]);
  });
});

describe("a parliamentary group", () => {
  it("cannot be deleted while it has voted in a scrutin", async () => {
    const textId = await publishedTextId();
    const [left] = await groupIds("GAU");
    await createVote(textId, { ...finalVote, groupVotes: [{ groupId: left, position: "for", counts: null }] });

    expect(await removeParliamentaryGroup(left)).toEqual({ ok: false, reason: "in-use" });
    expect(await getPublishedVotes(textId)).toMatchObject([{ groupVotes: [{ group: { id: left } }] }]);
  });
});


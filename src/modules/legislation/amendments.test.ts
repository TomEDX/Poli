import { describe, expect, it } from "vitest";

import { previousLegislatureGroupId } from "../../../test/previous-legislature";
import { createParliamentaryGroup, removeParliamentaryGroup } from "@/modules/reference/parliamentary-groups";
import { createSource } from "@/modules/reference/sources";
import { createSubtopic, createTopic } from "@/modules/reference/topics";

import {
  type AmendmentInput,
  createAmendment,
  getAmendments,
  getPublishedAmendments,
  removeAmendment,
  saveAmendment,
} from "./amendments";
import { createText, saveText } from "./texts";
import { createVote } from "./votes";

const amendment = {
  number: 12,
  authorLabel: "Mme Claire Martin",
  cosignatories: "M. Paul Durand et 14 autres députés",
  summary: "L’amendement réserve les ombrières aux parkings de plus de 1 500 m².",
  fate: "adopted",
  governmentOpinion: "wisdom",
  committeeOpinion: "favourable",
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

async function groupId(abbreviation: string) {
  const group = await createParliamentaryGroup({ name: `Groupe ${abbreviation}`, abbreviation, partyIds: [] });
  if (!group.ok) throw new Error(`Could not create ${abbreviation}`);
  return group.id;
}

describe("a published amendment of a published text", () => {
  it("shows with its author, the author's group, its fate and both opinions", async () => {
    const textId = await publishedTextId();
    const left = await groupId("GAU");

    const created = await createAmendment(textId, { ...amendment, authorGroupId: left, status: "published" });

    expect(created).toEqual({ ok: true, id: expect.any(String) });
    expect(await getPublishedAmendments(textId)).toEqual([
      {
        id: expect.any(String),
        number: 12,
        authorLabel: "Mme Claire Martin",
        authorGroup: { id: left, name: "Groupe GAU", abbreviation: "GAU" },
        cosignatories: "M. Paul Durand et 14 autres députés",
        summary: "L’amendement réserve les ombrières aux parkings de plus de 1 500 m².",
        fate: "adopted",
        governmentOpinion: "wisdom",
        committeeOpinion: "favourable",
        vote: null,
        sources: [],
      },
    ]);
  });

  it("is hidden while it is a draft, and all of them while their text is a draft", async () => {
    const textId = await publishedTextId();
    await createAmendment(textId, { ...amendment, authorGroupId: null, status: "published" });
    await createAmendment(textId, { ...amendment, number: 13, authorGroupId: null, status: "draft" });

    expect((await getPublishedAmendments(textId)).map((shown) => shown.number)).toEqual([12]);

    await saveText(textId, { status: "draft" });

    expect(await getPublishedAmendments(textId)).toEqual([]);
    expect(await getPublishedAmendments("amendement-12")).toEqual([]);
  });

  it("comes in the order of the amendment numbers", async () => {
    const textId = await publishedTextId();
    for (const number of [40, 3, 12]) {
      await createAmendment(textId, { ...amendment, number, authorGroupId: null, status: "published" });
    }

    expect((await getPublishedAmendments(textId)).map((shown) => shown.number)).toEqual([3, 12, 40]);
  });

  it("shows the group votes of its public scrutin", async () => {
    const textId = await publishedTextId();
    const [left, right] = [await groupId("GAU"), await groupId("DRO")];
    const linked = await createAmendment(textId, { ...amendment, authorGroupId: left, status: "published" });
    await createAmendment(textId, { ...amendment, number: 13, authorGroupId: null, status: "published" });
    if (!linked.ok) throw new Error("Could not create the amendment");
    const scrutin = {
      subject: "amendment",
      number: 398,
      heldOn: "2026-09-29",
      result: "adopted",
      officialUrl: "https://assemblee.example.org/scrutins/398",
    } as const;

    await createVote(textId, {
      ...scrutin,
      amendmentId: linked.id,
      groupVotes: [
        { groupId: right, position: "against", counts: null },
        { groupId: left, position: "for", counts: { for: 30, against: 0, abstention: 1, nonVoting: 2 } },
      ],
    });

    expect(await getPublishedAmendments(textId)).toMatchObject([
      {
        number: 12,
        vote: {
          ...scrutin,
          id: expect.any(String),
          groupVotes: [
            {
              group: { id: left, name: "Groupe GAU", abbreviation: "GAU" },
              position: "for",
              counts: { for: 30, against: 0, abstention: 1, nonVoting: 2 },
            },
            { group: { id: right, name: "Groupe DRO", abbreviation: "DRO" }, position: "against", counts: null },
          ],
        },
      },
      { number: 13, vote: null },
    ]);
  });
});

describe("amendments in the administration", () => {
  it("refuse a number another amendment of the text already has", async () => {
    const textId = await publishedTextId();
    await createAmendment(textId, { ...amendment, authorGroupId: null, status: "published" });

    expect(await createAmendment(textId, { ...amendment, authorGroupId: null, status: "draft" })).toEqual({
      ok: false,
      reason: "number-taken",
    });
    expect(await getAmendments(textId)).toMatchObject([{ status: "published" }]);
  });

  it("report a text or an author's group deleted meanwhile", async () => {
    const textId = await publishedTextId();
    const gone = "00000000-0000-4000-8000-000000000000";

    expect(await createAmendment(gone, { ...amendment, authorGroupId: null, status: "draft" })).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(await createAmendment(textId, { ...amendment, authorGroupId: gone, status: "draft" })).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(await getAmendments(textId)).toEqual([]);
  });

  it("refuse an author's group of another legislature", async () => {
    const textId = await publishedTextId();
    const former = await previousLegislatureGroupId("ANC");
    const created = await createAmendment(textId, { ...amendment, authorGroupId: null, status: "draft" });
    if (!created.ok) throw new Error("Could not create the amendment");
    const input = { ...amendment, number: 13, authorGroupId: former, status: "draft" } as const;

    expect(await createAmendment(textId, input)).toEqual({ ok: false, reason: "group-outside-legislature" });
    expect(await saveAmendment(created.id, input)).toEqual({ ok: false, reason: "group-outside-legislature" });
    expect(await getAmendments(textId)).toMatchObject([{ number: 12, authorGroupId: null }]);
  });

  it("are saved again as a whole, which publishes them or takes them offline", async () => {
    const textId = await publishedTextId();
    const left = await groupId("GAU");
    const created = await createAmendment(textId, { ...amendment, authorGroupId: null, status: "draft" });
    if (!created.ok) throw new Error("Could not create the amendment");

    const edited: AmendmentInput = {
      ...amendment,
      number: 14,
      authorGroupId: left,
      fate: "withdrawn",
      governmentOpinion: "none",
      status: "published",
    };
    expect(await saveAmendment(created.id, edited)).toEqual({ ok: true });
    expect(await getAmendments(textId)).toEqual([{ ...edited, id: created.id, vote: null, sourceIds: [] }]);
    expect(await getPublishedAmendments(textId)).toMatchObject([{ number: 14, fate: "withdrawn" }]);

    await createAmendment(textId, { ...amendment, authorGroupId: null, status: "draft" });
    expect(await saveAmendment(created.id, { ...edited, number: 12 })).toEqual({ ok: false, reason: "number-taken" });
    expect(await saveAmendment(created.id, { ...edited, status: "draft" })).toEqual({ ok: true });
    expect(await getPublishedAmendments(textId)).toEqual([]);
  });

  it("are deleted, and an amendment deleted meanwhile is reported", async () => {
    const textId = await publishedTextId();
    const input = { ...amendment, authorGroupId: null, status: "published" } as const;
    const created = await createAmendment(textId, input);
    if (!created.ok) throw new Error("Could not create the amendment");

    expect(await removeAmendment(created.id)).toEqual({ ok: true });
    expect(await getAmendments(textId)).toEqual([]);
    expect(await removeAmendment(created.id)).toEqual({ ok: false, reason: "not-found" });
    expect(await saveAmendment(created.id, input)).toEqual({ ok: false, reason: "not-found" });
  });

  it("are listed for a draft text too, drafts included, with what the form edits", async () => {
    const textId = await publishedTextId();
    await saveText(textId, { status: "draft" });
    const left = await groupId("GAU");
    const published = { ...amendment, number: 30, authorGroupId: left, status: "published" } as const;
    const draft = { ...amendment, number: 7, authorGroupId: null, cosignatories: null, status: "draft" } as const;
    await createAmendment(textId, published);
    await createAmendment(textId, draft);

    expect(await getAmendments(textId)).toEqual([
      { ...draft, id: expect.any(String), vote: null, sourceIds: [] },
      { ...published, id: expect.any(String), vote: null, sourceIds: [] },
    ]);

    const [, linked] = await getAmendments(textId);
    const scrutin = await createVote(textId, {
      subject: "amendment",
      number: 398,
      heldOn: "2026-09-29",
      result: "rejected",
      officialUrl: null,
      amendmentId: linked.id,
      groupVotes: [{ groupId: left, position: "against", counts: null }],
    });

    expect(await getAmendments(textId)).toMatchObject([
      { number: 7, vote: null },
      { number: 30, vote: { id: scrutin.ok && scrutin.id, number: 398 } },
    ]);
  });
});

describe("a parliamentary group", () => {
  it("cannot be deleted while it is the group of an amendment's author", async () => {
    const textId = await publishedTextId();
    const left = await groupId("GAU");
    await createAmendment(textId, { ...amendment, authorGroupId: left, status: "published" });

    expect(await removeParliamentaryGroup(left)).toEqual({ ok: false, reason: "in-use" });
    expect(await getPublishedAmendments(textId)).toMatchObject([{ authorGroup: { id: left } }]);
  });
});

describe("the sources of an amendment", () => {
  it("are linked and unlinked by the editors, and read with the amendment", async () => {
    const textId = await publishedTextId();
    const { id: sourceId } = await createSource({
      title: "Amendement n° 12",
      organization: "Assemblée nationale",
      url: "https://assemblee.example.org/amendements/12",
      consultedOn: "2026-10-01",
      kind: "official_text",
    });
    const input = { ...amendment, authorGroupId: null, status: "published" } as const;
    const created = await createAmendment(textId, { ...input, sourceIds: [sourceId] });
    if (!created.ok) throw new Error("Could not create the amendment");

    expect(await getAmendments(textId)).toMatchObject([{ id: created.id, sourceIds: [sourceId] }]);
    expect(await getPublishedAmendments(textId)).toMatchObject([
      {
        id: created.id,
        sources: [
          {
            id: sourceId,
            title: "Amendement n° 12",
            organization: "Assemblée nationale",
            url: "https://assemblee.example.org/amendements/12",
          },
        ],
      },
    ]);

    expect(await saveAmendment(created.id, { ...input, sourceIds: [] })).toEqual({ ok: true });
    expect(await getAmendments(textId)).toMatchObject([{ sourceIds: [] }]);
    expect(await getPublishedAmendments(textId)).toMatchObject([{ sources: [] }]);
  });
});

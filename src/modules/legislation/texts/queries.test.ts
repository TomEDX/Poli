import { describe, expect, it } from "vitest";

import { createSource, type SourceInput } from "@/modules/reference/sources/queries";
import { createSubtopic, createTopic, getTopicTree, removeNode } from "@/modules/reference/topics/queries";

import {
  countPublishedTexts,
  createText,
  getPublishedText,
  getPublishedTextTopics,
  getPublishedTexts,
  getText,
  getTexts,
  type NewText,
  removeText,
  saveText,
} from "./queries";

const energyBill = {
  nature: "government_bill",
  number: 105,
  officialTitle: "Projet de loi relatif à l'accélération de la production d'énergies renouvelables",
  filedOn: "2026-09-12",
  officialUrl: "https://assemblee.example.org/textes/105",
  summary: "Le texte simplifie les procédures pour installer des éoliennes et des panneaux solaires.",
} as const;

async function subtopicId(topic: string, subtopic: string) {
  const createdTopic = await createTopic({ name: topic, slug: topic.toLowerCase() });
  if (!createdTopic.ok) throw new Error(`Could not create ${topic}`);
  const created = await createSubtopic(createdTopic.id, { name: subtopic, slug: subtopic.toLowerCase() });
  if (!created.ok) throw new Error(`Could not create ${subtopic}`);
  return created.id;
}

async function textId(input: NewText) {
  const result = await createText(input);
  if (!result.ok) throw new Error(`Could not create text ${input.number}: ${result.reason}`);
  return result.id;
}

async function sourceId(input: SourceInput) {
  const result = await createSource(input);
  return result.id;
}

const officialText = {
  title: "Projet de loi n° 105",
  organization: "Assemblée nationale",
  url: "https://assemblee.example.org/textes/105",
  consultedOn: "2026-10-01",
  kind: "official_text",
} as const;

const impactStudy = {
  title: "Étude d'impact du projet de loi",
  organization: "Gouvernement",
  url: "https://gouvernement.example.org/etude-impact",
  consultedOn: "2026-10-02",
  kind: "other",
} as const;

describe("published texts", () => {
  it("are counted without the drafts", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    expect(await countPublishedTexts()).toBe(0);

    await textId({ ...energyBill, number: 1, subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 2, subtopicIds: [energy] });
    expect(await countPublishedTexts()).toBe(1);

    await textId({ ...energyBill, number: 3, subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 4, subtopicIds: [energy], status: "published" });
    expect(await countPublishedTexts()).toBe(3);
  });

  it("are listed from the most recently filed", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    await textId({ ...energyBill, number: 1, filedOn: "2025-01-20", subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 2, filedOn: "2026-03-02", subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 3, filedOn: "2025-11-15", subtopicIds: [energy], status: "published" });

    expect((await getPublishedTexts()).map((text) => text.number)).toEqual([2, 3, 1]);
  });

  it("can be listed from the earliest filed", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    await textId({ ...energyBill, number: 1, filedOn: "2025-01-20", subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 2, filedOn: "2026-03-02", subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 4, filedOn: "2025-11-15", subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 3, filedOn: "2025-11-15", subtopicIds: [energy], status: "published" });

    expect((await getPublishedTexts({ order: "oldest" })).map((text) => text.number)).toEqual([1, 3, 4, 2]);
    expect((await getPublishedTexts({ order: "newest" })).map((text) => text.number)).toEqual([2, 4, 3, 1]);
  });

  it("list only the texts published, with what the list shows", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const id = await textId({ ...energyBill, subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 106, subtopicIds: [energy] });

    expect(await getPublishedTexts()).toEqual([
      {
        id,
        nature: "government_bill",
        number: 105,
        officialTitle: energyBill.officialTitle,
        filedOn: "2026-09-12",
        subtopics: [{ id: energy, name: "Énergie", topic: { id: expect.any(String), name: "Écologie" } }],
      },
    ]);
  });

  it("show a published text in full, its editorial summary included", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const id = await textId({ ...energyBill, subtopicIds: [energy], status: "published" });

    expect(await getPublishedText(id)).toEqual({
      id,
      nature: "government_bill",
      number: 105,
      officialTitle: energyBill.officialTitle,
      filedOn: "2026-09-12",
      officialUrl: "https://assemblee.example.org/textes/105",
      summary: energyBill.summary,
      subtopics: [{ id: energy, name: "Énergie", topic: { id: expect.any(String), name: "Écologie" } }],
      sources: [],
    });
  });

  it("keep a draft, or a text that does not exist, out of public reach", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const draft = await textId({ ...energyBill, subtopicIds: [energy] });

    expect(await getPublishedText(draft)).toBeNull();
    expect(await getPublishedText("00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await getPublishedText("projet-de-loi-105")).toBeNull();
  });
});

describe("filtering published texts", () => {
  it("keeps the texts filed under a subtopic of the topic", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const [ecology] = await getTopicTree();
    const climate = await createSubtopic(ecology.id, { name: "Climat", slug: "climat" });
    if (!climate.ok) throw new Error("Could not create Climat");
    const schools = await subtopicId("Éducation", "École");
    await textId({ ...energyBill, number: 1, filedOn: "2026-01-10", subtopicIds: [energy], status: "published" });
    await textId({
      ...energyBill,
      number: 2,
      filedOn: "2026-02-10",
      subtopicIds: [schools, climate.id],
      status: "published",
    });
    await textId({ ...energyBill, number: 3, subtopicIds: [schools], status: "published" });
    await textId({ ...energyBill, number: 4, subtopicIds: [energy] });

    expect((await getPublishedTexts({ topicId: ecology.id })).map((text) => text.number)).toEqual([2, 1]);
  });

  it("keeps the texts filed under the subtopic, leaving out its sibling subtopics", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const [ecology] = await getTopicTree();
    const climate = await createSubtopic(ecology.id, { name: "Climat", slug: "climat" });
    if (!climate.ok) throw new Error("Could not create Climat");
    await textId({ ...energyBill, number: 1, subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 2, subtopicIds: [climate.id, energy], status: "published" });
    await textId({ ...energyBill, number: 3, subtopicIds: [climate.id], status: "published" });

    expect((await getPublishedTexts({ subtopicId: climate.id })).map((text) => text.number)).toEqual([3, 2]);
  });

  it("keeps the texts of the nature, and only those matching every filter given", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const [ecology] = await getTopicTree();
    const schools = await subtopicId("Éducation", "École");
    await textId({ ...energyBill, number: 1, nature: "member_bill", subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 2, nature: "member_bill", subtopicIds: [schools], status: "published" });
    await textId({ ...energyBill, number: 3, subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 4, nature: "member_bill", subtopicIds: [energy] });

    expect((await getPublishedTexts({ nature: "member_bill" })).map((text) => text.number)).toEqual([2, 1]);
    expect(
      (await getPublishedTexts({ nature: "member_bill", topicId: ecology.id })).map((text) => text.number),
    ).toEqual([1]);
  });

  it("offers only the topics and subtopics that have a published text, in the order of the tree", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const [ecology] = await getTopicTree();
    const climate = await createSubtopic(ecology.id, { name: "Climat", slug: "climat" });
    const water = await createSubtopic(ecology.id, { name: "Eau", slug: "eau" });
    if (!climate.ok || !water.ok) throw new Error("Could not create the subtopics");
    const schools = await subtopicId("Éducation", "École");
    const hospitals = await subtopicId("Santé", "Hôpital");
    await textId({ ...energyBill, number: 1, subtopicIds: [water.id, energy], status: "published" });
    await textId({ ...energyBill, number: 2, subtopicIds: [hospitals], status: "published" });
    await textId({ ...energyBill, number: 3, subtopicIds: [schools, climate.id] });

    expect(await getPublishedTextTopics()).toEqual([
      {
        id: ecology.id,
        name: "Écologie",
        slug: "écologie",
        subtopics: [
          { id: energy, name: "Énergie", slug: "énergie" },
          { id: water.id, name: "Eau", slug: "eau" },
        ],
      },
      {
        id: expect.any(String),
        name: "Santé",
        slug: "santé",
        subtopics: [{ id: hospitals, name: "Hôpital", slug: "hôpital" }],
      },
    ]);
  });
});

describe("publishing a text", () => {
  it("needs at least one subtopic", async () => {
    expect(await createText({ ...energyBill, subtopicIds: [], status: "published" })).toEqual({
      ok: false,
      reason: "no-subtopic",
    });
    const draft = await textId({ ...energyBill, subtopicIds: [] });

    expect(await saveText(draft, { status: "published" })).toEqual({ ok: false, reason: "no-subtopic" });
    expect(await getPublishedTexts()).toEqual([]);
  });

  it("keeps a published text filed under at least one subtopic", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const id = await textId({ ...energyBill, subtopicIds: [energy], status: "published" });

    expect(await saveText(id, { subtopicIds: [] })).toEqual({ ok: false, reason: "no-subtopic" });
    expect(await getPublishedText(id)).toMatchObject({ subtopics: [{ id: energy }] });
  });

  it("shows the text once filed and published, and hides it again when unpublished", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const id = await textId({ ...energyBill, subtopicIds: [] });

    expect(await saveText(id, { subtopicIds: [energy], status: "published" })).toEqual({ ok: true });
    expect(await getPublishedTexts()).toMatchObject([{ id }]);

    expect(await saveText(id, { status: "draft" })).toEqual({ ok: true });
    expect(await getPublishedTexts()).toEqual([]);
    expect(await getPublishedText(id)).toBeNull();
  });
});

describe("editing a text", () => {
  it("changes only the fields given, so a save never restores another editor's older value", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const id = await textId({ ...energyBill, subtopicIds: [energy], status: "published" });

    await saveText(id, { summary: "Un résumé revu." });
    expect(await saveText(id, { officialUrl: null, nature: "member_bill" })).toEqual({ ok: true });

    expect(await getPublishedText(id)).toMatchObject({
      officialTitle: energyBill.officialTitle,
      nature: "member_bill",
      officialUrl: null,
      summary: "Un résumé revu.",
    });
  });

  it("refiles the text under the subtopics picked, each once", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const [ecology] = await getTopicTree();
    const climate = await createSubtopic(ecology.id, { name: "Climat", slug: "climat" });
    if (!climate.ok) throw new Error("Could not create Climat");
    const id = await textId({ ...energyBill, subtopicIds: [energy], status: "published" });

    expect(await saveText(id, { subtopicIds: [climate.id] })).toEqual({ ok: true });
    expect(await getPublishedText(id)).toMatchObject({ subtopics: [{ id: climate.id, name: "Climat" }] });
  });

  it("refuses a number another text of the legislature already has, and writes nothing", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    await textId({ ...energyBill, subtopicIds: [energy] });
    const other = await textId({ ...energyBill, number: 230, subtopicIds: [energy] });

    expect(await createText({ ...energyBill, subtopicIds: [energy] })).toEqual({ ok: false, reason: "number-taken" });
    expect(await saveText(other, { number: 105, subtopicIds: [] })).toEqual({ ok: false, reason: "number-taken" });
    expect(await getTexts()).toMatchObject([{ number: 230, subtopicIds: [energy] }, { number: 105 }]);
  });

  it("reports a text or a subtopic deleted meanwhile", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const id = await textId({ ...energyBill, subtopicIds: [energy] });
    expect(await removeText(id)).toEqual({ ok: true });

    expect(await saveText(id, { summary: "Résumé" })).toEqual({ ok: false, reason: "not-found" });
    expect(await removeText(id)).toEqual({ ok: false, reason: "not-found" });
    const gone = "00000000-0000-4000-8000-000000000000";
    expect(await createText({ ...energyBill, subtopicIds: [gone] })).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("texts in the administration", () => {
  it("are all listed, drafts included, with what the form edits", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const draft = await textId({ ...energyBill, number: 230, filedOn: "2026-10-01", subtopicIds: [] });
    const published = await textId({ ...energyBill, subtopicIds: [energy], status: "published" });

    expect(await getTexts()).toEqual([
      { ...energyBill, id: draft, number: 230, filedOn: "2026-10-01", status: "draft", subtopicIds: [], sourceIds: [] },
      { ...energyBill, id: published, status: "published", subtopicIds: [energy], sourceIds: [] },
    ]);
  });

  it("are read one at a time, a draft too, and a text that does not exist reads as none", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const draft = await textId({ ...energyBill, subtopicIds: [energy] });
    await textId({ ...energyBill, number: 230, subtopicIds: [] });

    expect(await getText(draft)).toEqual({
      ...energyBill,
      id: draft,
      status: "draft",
      subtopicIds: [energy],
      sourceIds: [],
    });
    expect(await getText("00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await getText("texte-105")).toBeNull();
  });
});

describe("a subtopic", () => {
  it("cannot be deleted while a text is filed under it", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    await textId({ ...energyBill, subtopicIds: [energy] });

    expect(await removeNode({ level: "subtopic", id: energy })).toEqual({ ok: false, reason: "in-use" });
  });
});

describe("the sources of a text", () => {
  it("are linked and unlinked by the editors, and read with the text", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const [official, study] = [await sourceId(officialText), await sourceId(impactStudy)];
    const id = await textId({ ...energyBill, subtopicIds: [energy], sourceIds: [study, official], status: "published" });

    expect((await getText(id))?.sourceIds.toSorted()).toEqual([official, study].toSorted());
    expect((await getPublishedText(id))?.sources).toEqual([
      { id: official, title: "Projet de loi n° 105", organization: "Assemblée nationale", url: officialText.url },
      { id: study, title: "Étude d'impact du projet de loi", organization: "Gouvernement", url: impactStudy.url },
    ]);

    expect(await saveText(id, { sourceIds: [official] })).toEqual({ ok: true });
    expect((await getText(id))?.sourceIds).toEqual([official]);
    expect((await getPublishedText(id))?.sources.map((source) => source.id)).toEqual([official]);
  });

  it("are not needed to publish it", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    const id = await textId({ ...energyBill, subtopicIds: [energy], status: "published" });

    expect((await getPublishedText(id))?.sources).toEqual([]);
    expect((await getText(id))?.sourceIds).toEqual([]);
  });
});

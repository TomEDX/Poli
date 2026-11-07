import { describe, expect, it } from "vitest";

import { createSubtopic, createTopic, getTopicTree, removeNode } from "@/modules/reference/topics";

import {
  createText,
  getPublishedText,
  getPublishedTexts,
  getTexts,
  type NewText,
  removeText,
  saveText,
} from "./texts";

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

describe("published texts", () => {
  it("are listed from the most recently filed", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    await textId({ ...energyBill, number: 1, filedOn: "2025-01-20", subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 2, filedOn: "2026-03-02", subtopicIds: [energy], status: "published" });
    await textId({ ...energyBill, number: 3, filedOn: "2025-11-15", subtopicIds: [energy], status: "published" });

    expect((await getPublishedTexts()).map((text) => text.number)).toEqual([2, 3, 1]);
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
      { ...energyBill, id: draft, number: 230, filedOn: "2026-10-01", status: "draft", subtopicIds: [] },
      { ...energyBill, id: published, status: "published", subtopicIds: [energy] },
    ]);
  });
});

describe("a subtopic", () => {
  it("cannot be deleted while a text is filed under it", async () => {
    const energy = await subtopicId("Écologie", "Énergie");
    await textId({ ...energyBill, subtopicIds: [energy] });

    expect(await removeNode({ level: "subtopic", id: energy })).toEqual({ ok: false, reason: "in-use" });
  });
});

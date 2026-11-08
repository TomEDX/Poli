import { describe, expect, it } from "vitest";

import { setCandidacyStatus, createParty, getParties } from "@/modules/reference/parties/queries";
import { createSource, removeSource } from "@/modules/reference/sources/queries";
import { createSubtopic, createTopic } from "@/modules/reference/topics/queries";

import {
  createExtract,
  getComparisonGrid,
  getExtracts,
  getPublishedProgramme,
  getSubtopicsWithoutExtract,
  moveExtract,
  removeExtract,
  saveExtract,
} from "./queries";

const extract = {
  quote: "Nous rendrons gratuit un bilan de prévention à 25, 45 et 65 ans.",
  recordedOn: "2026-10-12",
  sourceIds: [] as string[],
};

async function subtopicId(topicName: string, name: string) {
  const topic = await createTopic({ name: topicName, slug: slugOf(topicName) });
  if (!topic.ok) throw new Error(`Could not create ${topicName}`);
  const subtopic = await createSubtopic(topic.id, { name, slug: slugOf(name) });
  if (!subtopic.ok) throw new Error(`Could not create ${name}`);
  return subtopic.id;
}

async function candidacyId(abbreviation: string, status: "draft" | "published" = "published") {
  await createParty({ name: `Parti ${abbreviation}`, abbreviation, candidacy: { candidateName: null, status } });
  const party = (await getParties()).find((found) => found.abbreviation === abbreviation);
  if (!party?.candidacy) throw new Error(`Could not create the candidacy of ${abbreviation}`);
  return party.candidacy.id;
}

function slugOf(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z]+/g, "-")
    .toLowerCase();
}

async function sourceId(title: string) {
  const source = await createSource({
    title,
    organization: "Parti PDH",
    url: `https://pdh.example.org/${slugOf(title)}`,
    consultedOn: "2026-10-12",
    kind: "program",
  });
  return source.id;
}

describe("the public programme of a candidacy", () => {
  it("holds its published extracts with their subtopic, never a draft", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const candidacy = await candidacyId("PDH");

    await createExtract(candidacy, { ...extract, subtopicId: prevention, status: "published" });
    await createExtract(candidacy, { ...extract, quote: "Un brouillon.", subtopicId: prevention, status: "draft" });

    expect(await getPublishedProgramme(candidacy)).toEqual([
      {
        id: expect.any(String),
        quote: "Nous rendrons gratuit un bilan de prévention à 25, 45 et 65 ans.",
        recordedOn: "2026-10-12",
        subtopic: { id: prevention, name: "Prévention", topic: { id: expect.any(String), name: "Santé" } },
        sources: [],
      },
    ]);
  });

  it("is empty while the candidacy is a draft, or for an id that is not a candidacy", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const candidacy = await candidacyId("PDH");
    await createExtract(candidacy, { ...extract, subtopicId: prevention, status: "published" });

    await setCandidacyStatus(candidacy, "draft");

    expect(await getPublishedProgramme(candidacy)).toEqual([]);
    expect(await getPublishedProgramme("parti-de-l-horizon")).toEqual([]);
  });
});

describe("the order of a programme", () => {
  it("follows the topic tree, then the order the editors gave within each subtopic", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const hospital = await subtopicId("Hôpital public", "Urgences");
    const candidacy = await candidacyId("PDH");
    for (const [quote, subtopic] of [
      ["Urgences 1", hospital],
      ["Prévention 1", prevention],
      ["Prévention 2", prevention],
    ]) {
      await createExtract(candidacy, { ...extract, quote, subtopicId: subtopic, status: "published" });
    }

    expect((await getPublishedProgramme(candidacy)).map((shown) => shown.quote)).toEqual([
      "Prévention 1",
      "Prévention 2",
      "Urgences 1",
    ]);
  });

  it("changes when an editor moves an extract up or down within its subtopic", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const candidacy = await candidacyId("PDH");
    const other = await candidacyId("UDT");
    await createExtract(other, { ...extract, quote: "Autre candidature", subtopicId: prevention, status: "published" });
    for (const quote of ["Premier", "Deuxième", "Troisième"]) {
      await createExtract(candidacy, { ...extract, quote, subtopicId: prevention, status: "published" });
    }
    const [first, , third] = await getExtracts(candidacy);

    expect(await moveExtract(third.id, "up")).toEqual({ ok: true });
    expect(await moveExtract(first.id, "up")).toEqual({ ok: true, unchanged: true });
    expect(await moveExtract(first.id, "down")).toEqual({ ok: true });

    expect((await getExtracts(candidacy)).map((shown) => shown.quote)).toEqual(["Troisième", "Premier", "Deuxième"]);
    expect((await getExtracts(other)).map((shown) => shown.quote)).toEqual(["Autre candidature"]);
  });
});

describe("an edited extract", () => {
  it("replaces the previous version, with its new recording date and sources, once published", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const candidacy = await candidacyId("PDH");
    const [programme, booklet] = [await sourceId("Programme"), await sourceId("Livret santé")];
    const created = await createExtract(candidacy, { ...extract, subtopicId: prevention, sourceIds: [programme] });
    if (!created.ok) throw new Error("Could not create the extract");

    expect(
      await saveExtract(created.id, {
        quote: "Nous rendrons gratuit un bilan de prévention à 25, 40, 55 et 70 ans.",
        recordedOn: "2026-11-05",
        sourceIds: [booklet],
        status: "published",
      }),
    ).toEqual({ ok: true });

    expect(await getPublishedProgramme(candidacy)).toEqual([
      {
        id: created.id,
        quote: "Nous rendrons gratuit un bilan de prévention à 25, 40, 55 et 70 ans.",
        recordedOn: "2026-11-05",
        subtopic: { id: prevention, name: "Prévention", topic: { id: expect.any(String), name: "Santé" } },
        sources: [{ id: booklet, title: "Livret santé", organization: "Parti PDH", url: "https://pdh.example.org/livret-sante" }],
      },
    ]);
  });

  it("keeps what is not changed, and goes last when it moves to another subtopic", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const hospital = await subtopicId("Hôpital public", "Urgences");
    const candidacy = await candidacyId("PDH");
    const programme = await sourceId("Programme");
    await createExtract(candidacy, { ...extract, quote: "Urgences 1", subtopicId: hospital });
    const moved = await createExtract(candidacy, { ...extract, subtopicId: prevention, sourceIds: [programme] });
    if (!moved.ok) throw new Error("Could not create the extract");

    expect(await saveExtract(moved.id, { subtopicId: hospital })).toEqual({ ok: true });

    expect(await getExtracts(candidacy)).toEqual([
      expect.objectContaining({ quote: "Urgences 1" }),
      {
        id: moved.id,
        subtopicId: hospital,
        quote: extract.quote,
        recordedOn: extract.recordedOn,
        sourceIds: [programme],
        status: "draft",
      },
    ]);
  });
});

describe("extracts in the administration", () => {
  it("are deleted for good", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const candidacy = await candidacyId("PDH");
    const created = await createExtract(candidacy, { ...extract, subtopicId: prevention, status: "published" });
    if (!created.ok) throw new Error("Could not create the extract");

    expect(await removeExtract(created.id)).toEqual({ ok: true });

    expect(await getExtracts(candidacy)).toEqual([]);
    expect(await getPublishedProgramme(candidacy)).toEqual([]);
    expect(await removeExtract(created.id)).toEqual({ ok: false, reason: "not-found" });
  });

  it("report a candidacy, subtopic, source or extract deleted meanwhile", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const candidacy = await candidacyId("PDH");
    const gone = "00000000-0000-4000-8000-000000000000";
    const created = await createExtract(candidacy, { ...extract, subtopicId: prevention });
    if (!created.ok) throw new Error("Could not create the extract");
    const notFound = { ok: false, reason: "not-found" };

    expect(await createExtract(gone, { ...extract, subtopicId: prevention })).toEqual(notFound);
    expect(await createExtract(candidacy, { ...extract, subtopicId: gone })).toEqual(notFound);
    expect(await createExtract(candidacy, { ...extract, subtopicId: prevention, sourceIds: [gone] })).toEqual(notFound);
    expect(await saveExtract(created.id, { quote: "Changé", sourceIds: [gone] })).toEqual(notFound);
    expect(await saveExtract(gone, { quote: "Changé" })).toEqual(notFound);
    expect(await moveExtract(gone, "up")).toEqual(notFound);

    expect(await getExtracts(candidacy)).toMatchObject([{ id: created.id, quote: extract.quote }]);
  });

  it("keep their sources: a source an extract links to cannot be deleted", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const candidacy = await candidacyId("PDH");
    const programme = await sourceId("Programme");
    await createExtract(candidacy, { ...extract, subtopicId: prevention, sourceIds: [programme] });

    expect(await removeSource(programme)).toEqual({ ok: false, reason: "in-use" });
    expect(await getExtracts(candidacy)).toMatchObject([{ sourceIds: [programme] }]);
  });
});

describe("the subtopics without an extract", () => {
  it("are those where the candidacy has nothing yet, draft or published, in the order of the tree", async () => {
    const health = await createTopic({ name: "Santé", slug: "sante" });
    const school = await createTopic({ name: "Éducation", slug: "education" });
    await createTopic({ name: "Culture", slug: "culture" });
    if (!health.ok || !school.ok) throw new Error("Could not create the topics");
    const subtopics = [];
    for (const [topicId, name, slug] of [
      [health.id, "Prévention", "prevention"],
      [health.id, "Hôpital", "hopital"],
      [health.id, "Médecine de ville", "medecine-de-ville"],
      [school.id, "École", "ecole"],
    ]) {
      const subtopic = await createSubtopic(topicId, { name, slug });
      if (!subtopic.ok) throw new Error(`Could not create ${name}`);
      subtopics.push(subtopic.id);
    }
    const [prevention, hospital, , primarySchool] = subtopics;
    const candidacy = await candidacyId("PDH");
    const other = await candidacyId("UDT");
    await createExtract(candidacy, { ...extract, subtopicId: prevention, status: "published" });
    await createExtract(candidacy, { ...extract, subtopicId: primarySchool, status: "draft" });
    await createExtract(other, { ...extract, subtopicId: hospital, status: "published" });

    expect(await getSubtopicsWithoutExtract(candidacy)).toEqual([
      {
        id: health.id,
        name: "Santé",
        subtopics: [
          { id: hospital, name: "Hôpital" },
          { id: subtopics[2], name: "Médecine de ville" },
        ],
      },
    ]);
  });
});

describe("the comparison grid", () => {
  it("holds, for every subtopic of the tree, the published extracts of each candidacy or nothing", async () => {
    const health = await createTopic({ name: "Santé", slug: "sante" });
    const school = await createTopic({ name: "Éducation", slug: "education" });
    await createTopic({ name: "Culture", slug: "culture" });
    if (!health.ok || !school.ok) throw new Error("Could not create the topics");
    const prevention = await createSubtopic(health.id, { name: "Prévention", slug: "prevention" });
    const hospital = await createSubtopic(health.id, { name: "Hôpital", slug: "hopital" });
    const primarySchool = await createSubtopic(school.id, { name: "École", slug: "ecole" });
    if (!prevention.ok || !hospital.ok || !primarySchool.ok) throw new Error("Could not create the subtopics");
    const horizon = await candidacyId("PDH");
    const territories = await candidacyId("UDT");
    const notCompared = await candidacyId("MES");
    const programme = await sourceId("Programme");
    await createExtract(horizon, { ...extract, subtopicId: prevention.id, status: "published" });
    await createExtract(horizon, { ...extract, quote: "Un brouillon.", subtopicId: hospital.id, status: "draft" });
    for (const quote of ["Urgences 1", "Urgences 2"]) {
      await createExtract(territories, {
        quote,
        recordedOn: "2026-11-02",
        subtopicId: hospital.id,
        sourceIds: [programme],
        status: "published",
      });
    }
    await createExtract(notCompared, { ...extract, subtopicId: primarySchool.id, status: "published" });

    const nothing = (candidacy: string) => ({ candidacyId: candidacy, extracts: [] });
    const urgences = (quote: string) => ({
      id: expect.any(String),
      quote,
      recordedOn: "2026-11-02",
      sources: [{ id: programme, title: "Programme", organization: "Parti PDH", url: "https://pdh.example.org/programme" }],
    });
    expect(await getComparisonGrid([territories, horizon])).toEqual([
      {
        id: health.id,
        name: "Santé",
        slug: "sante",
        subtopics: [
          {
            id: prevention.id,
            name: "Prévention",
            cells: [
              nothing(territories),
              {
                candidacyId: horizon,
                extracts: [{ id: expect.any(String), quote: extract.quote, recordedOn: "2026-10-12", sources: [] }],
              },
            ],
          },
          {
            id: hospital.id,
            name: "Hôpital",
            cells: [{ candidacyId: territories, extracts: [urgences("Urgences 1"), urgences("Urgences 2")] }, nothing(horizon)],
          },
        ],
      },
      {
        id: school.id,
        name: "Éducation",
        slug: "education",
        subtopics: [{ id: primarySchool.id, name: "École", cells: [nothing(territories), nothing(horizon)] }],
      },
    ]);
  });

  it("has nothing for a draft candidacy, or an id that is not a candidacy", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const candidacy = await candidacyId("PDH", "draft");
    await createExtract(candidacy, { ...extract, subtopicId: prevention, status: "published" });

    const [health] = await getComparisonGrid([candidacy, "parti-de-l-horizon"]);

    expect(health.subtopics[0].cells).toEqual([
      { candidacyId: candidacy, extracts: [] },
      { candidacyId: "parti-de-l-horizon", extracts: [] },
    ]);
  });

  it("refuses more than three candidacies", async () => {
    const ids = await Promise.all(["PDH", "UDT", "MES", "AC"].map((abbreviation) => candidacyId(abbreviation)));

    await expect(getComparisonGrid(ids)).rejects.toThrow("At most 3 candidacies can be compared.");
  });
});


import { describe, expect, it } from "vitest";

import { createParty, getParties, setCandidacyStatus } from "@/modules/reference/parties/queries";
import { createSource, removeSource } from "@/modules/reference/sources/queries";
import { createSubtopic, createTopic, removeNode } from "@/modules/reference/topics/queries";

import { getMissingPositions } from "../positions/queries";
import {
  createQuestion,
  getPublishedQuiz,
  getQuestions,
  moveQuestion,
  removeQuestion,
  saveQuestion,
} from "./queries";

const statement = "Il faut rendre gratuits les bilans de prévention.";

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

async function questionId(subtopic: string, text = statement, status: "draft" | "published" = "published") {
  const created = await createQuestion({ subtopicId: subtopic, statement: text, positions: [], status });
  if (!created.ok) throw new Error(`Could not create the question ${text}`);
  return created.id;
}

function slugOf(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z]+/g, "-")
    .toLowerCase();
}

describe("the public quiz", () => {
  it("holds the published questions with the positions of the published candidacies, never a draft", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const [shown, hidden] = [await candidacyId("PDH"), await candidacyId("UDT", "draft")];
    const programme = await sourceId("Programme");
    await createQuestion({
      subtopicId: prevention,
      statement,
      positions: [
        { candidacyId: shown, value: 2, sourceId: programme },
        { candidacyId: hidden, value: -2, sourceId: null },
      ],
      status: "published",
    });
    await createQuestion({
      subtopicId: prevention,
      statement: "Une question en brouillon.",
      positions: [{ candidacyId: shown, value: 1, sourceId: null }],
      status: "draft",
    });

    expect(await getPublishedQuiz()).toEqual([
      {
        id: expect.any(String),
        statement,
        subtopic: { id: prevention, name: "Prévention", topic: { id: expect.any(String), name: "Santé" } },
        positions: [
          {
            candidacyId: shown,
            value: 2,
            source: { id: programme, title: "Programme", organization: "Parti PDH", url: "https://pdh.example.org/programme" },
          },
        ],
      },
    ]);
  });

  it("gives no position as null, and loses the positions of a candidacy taken offline", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const [silent, other] = [await candidacyId("PDH"), await candidacyId("UDT")];
    await createQuestion({
      subtopicId: prevention,
      statement,
      positions: [
        { candidacyId: silent, value: null, sourceId: null },
        { candidacyId: other, value: -1, sourceId: null },
      ],
      status: "published",
    });

    await setCandidacyStatus(other, "draft");

    expect((await getPublishedQuiz())[0].positions).toEqual([{ candidacyId: silent, value: null, source: null }]);
  });

  it("follows the topic tree, then the order the editors gave within each subtopic", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const hospital = await subtopicId("Hôpital public", "Urgences");
    await questionId(hospital, "Urgences 1");
    await questionId(prevention, "Prévention 1");
    const second = await questionId(prevention, "Prévention 2");

    expect(await moveQuestion(second, "up")).toEqual({ ok: true });
    expect(await moveQuestion(second, "up")).toEqual({ ok: true, unchanged: true });

    expect((await getPublishedQuiz()).map((question) => question.statement)).toEqual([
      "Prévention 2",
      "Prévention 1",
      "Urgences 1",
    ]);
  });
});

describe("the positions of a question", () => {
  it("are one per candidacy: a candidacy given twice is refused and nothing is written", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const candidacy = await candidacyId("PDH");
    const twice = [
      { candidacyId: candidacy, value: 2 as const, sourceId: null },
      { candidacyId: candidacy, value: -2 as const, sourceId: null },
    ];

    expect(await createQuestion({ subtopicId: prevention, statement, positions: twice })).toEqual({
      ok: false,
      reason: "candidacy-positioned-twice",
    });
    expect(await getQuestions()).toEqual([]);

    const question = await questionId(prevention);
    expect(await saveQuestion(question, { statement: "Changée", positions: twice })).toEqual({
      ok: false,
      reason: "candidacy-positioned-twice",
    });
    expect(await getQuestions()).toMatchObject([{ statement, positions: [] }]);
  });

  it("are replaced on each save, so a candidacy keeps a single one", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const [first, second] = [await candidacyId("PDH"), await candidacyId("UDT")];
    const question = await questionId(prevention);

    await saveQuestion(question, { positions: [{ candidacyId: first, value: 1, sourceId: null }] });
    await saveQuestion(question, {
      positions: [
        { candidacyId: first, value: -1, sourceId: null },
        { candidacyId: second, value: null, sourceId: null },
      ],
    });

    expect((await getQuestions())[0].positions).toEqual([
      { candidacyId: first, value: -1, sourceId: null },
      { candidacyId: second, value: null, sourceId: null },
    ]);
  });

  it("are missing for every candidacy, drafts included, that has none yet; no position is not missing", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const hospital = await subtopicId("Hôpital public", "Urgences");
    const [filled, silent, draft] = [await candidacyId("PDH"), await candidacyId("UDT"), await candidacyId("AC", "draft")];
    const complete = await questionId(prevention, "Complète");
    const partial = await questionId(prevention, "Partielle", "draft");
    const empty = await questionId(hospital, "Vide");
    await saveQuestion(complete, {
      positions: [
        { candidacyId: filled, value: 2, sourceId: null },
        { candidacyId: silent, value: null, sourceId: null },
        { candidacyId: draft, value: 0, sourceId: null },
      ],
    });
    await saveQuestion(partial, { positions: [{ candidacyId: filled, value: 1, sourceId: null }] });

    const missing = await getMissingPositions();

    expect(missing.map((question) => question.questionId)).toEqual([partial, empty]);
    expect(new Set(missing[0].candidacyIds)).toEqual(new Set([silent, draft]));
    expect(new Set(missing[1].candidacyIds)).toEqual(new Set([filled, silent, draft]));
  });

  it("keep their source from being deleted", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const candidacy = await candidacyId("PDH");
    const programme = await sourceId("Programme");
    await createQuestion({
      subtopicId: prevention,
      statement,
      positions: [{ candidacyId: candidacy, value: 2, sourceId: programme }],
    });

    expect(await removeSource(programme)).toEqual({ ok: false, reason: "in-use" });
  });
});

describe("questions in the administration", () => {
  it("keep what is not changed, and go last when moved to another subtopic", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const hospital = await subtopicId("Hôpital public", "Urgences");
    const candidacy = await candidacyId("PDH");
    await questionId(hospital, "Urgences 1", "draft");
    const created = await createQuestion({
      subtopicId: prevention,
      statement,
      positions: [{ candidacyId: candidacy, value: 1, sourceId: null }],
    });
    if (!created.ok) throw new Error("Could not create the question");

    expect(await saveQuestion(created.id, { subtopicId: hospital })).toEqual({ ok: true });

    expect(await getQuestions()).toEqual([
      expect.objectContaining({ statement: "Urgences 1" }),
      {
        id: created.id,
        subtopicId: hospital,
        statement,
        positions: [{ candidacyId: candidacy, value: 1, sourceId: null }],
        status: "draft",
      },
    ]);
  });

  it("are deleted with their positions, and keep their subtopic from being deleted", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const candidacy = await candidacyId("PDH");
    const created = await createQuestion({
      subtopicId: prevention,
      statement,
      positions: [{ candidacyId: candidacy, value: 1, sourceId: null }],
      status: "published",
    });
    if (!created.ok) throw new Error("Could not create the question");

    expect(await removeNode({ level: "subtopic", id: prevention })).toEqual({ ok: false, reason: "in-use" });
    expect(await removeQuestion(created.id)).toEqual({ ok: true });

    expect(await getQuestions()).toEqual([]);
    expect(await getPublishedQuiz()).toEqual([]);
    expect(await getMissingPositions()).toEqual([]);
    expect(await removeQuestion(created.id)).toEqual({ ok: false, reason: "not-found" });
  });

  it("report a subtopic, candidacy, source or question deleted meanwhile", async () => {
    const prevention = await subtopicId("Santé", "Prévention");
    const gone = "00000000-0000-4000-8000-000000000000";
    const notFound = { ok: false, reason: "not-found" };
    const question = await questionId(prevention);

    expect(await createQuestion({ subtopicId: gone, statement, positions: [] })).toEqual(notFound);
    expect(await saveQuestion(question, { positions: [{ candidacyId: gone, value: 1, sourceId: null }] })).toEqual(notFound);
    const candidacy = await candidacyId("PDH");
    expect(await saveQuestion(question, { positions: [{ candidacyId: candidacy, value: 1, sourceId: gone }] })).toEqual(
      notFound,
    );
    expect(await saveQuestion(gone, { statement })).toEqual(notFound);
    expect(await moveQuestion(gone, "up")).toEqual(notFound);
  });
});

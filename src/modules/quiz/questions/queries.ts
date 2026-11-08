import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { Direction } from "@/lib/direction";
import { Refused, refusalOf } from "@/lib/write-refusals";
import type { WriteOutcome } from "@/modules/editors/editor-write";
import type { PublicationStatus } from "@/modules/reference/publication-status";
import { subtopics, topics } from "@/modules/reference/schema";

import {
  type PositionInput,
  positionsOf,
  type PublishedPosition,
  publishedPositionsOf,
  replacePositions,
} from "../positions/queries";
import { questionOrder } from "../question-order";
import { questions } from "../schema";

export type QuestionInput = {
  subtopicId: string;
  // An affirmation the visitor agrees or disagrees with.
  statement: string;
  // At most one per candidacy; a candidacy left out has no position entered yet.
  positions: PositionInput[];
};

// A new question is a draft unless it is published right away.
export type NewQuestion = QuestionInput & { status?: PublicationStatus };

// Only the given fields change; positions, when given, replaces every position of the question.
export type QuestionChanges = Partial<NewQuestion>;

export type PublishedQuestion = {
  id: string;
  statement: string;
  subtopic: { id: string; name: string; topic: { id: string; name: string } };
  // Only those of published candidacies.
  positions: PublishedPosition[];
};

// What the administration lists and edits, drafts included.
export type EditableQuestion = QuestionInput & { id: string; status: PublicationStatus };

export type CreateQuestionResult = { ok: true; id: string } | { ok: false; reason: QuestionRefusal };

export type SaveQuestionResult = WriteOutcome<QuestionRefusal>;

export type MoveQuestionResult = WriteOutcome<"not-found">;

export type RemoveQuestionResult = WriteOutcome<"not-found">;

type QuestionRefusal = "candidacy-positioned-twice" | "not-found";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const takenReasons: Record<string, QuestionRefusal> = {
  positions_question_id_candidacy_id_unique: "candidacy-positioned-twice",
};

/**
 * The full quiz: every published question in the order of the quiz, with the positions of
 * the published candidacies only.
 */
export async function getPublishedQuiz(): Promise<PublishedQuestion[]> {
  const rows = await db
    .select({
      id: questions.id,
      statement: questions.statement,
      subtopic: { id: subtopics.id, name: subtopics.name },
      topic: { id: topics.id, name: topics.name },
    })
    .from(questions)
    .innerJoin(subtopics, eq(subtopics.id, questions.subtopicId))
    .innerJoin(topics, eq(topics.id, subtopics.topicId))
    .where(eq(questions.status, "published"))
    .orderBy(...questionOrder);
  const positionsByQuestion = await publishedPositionsOf(rows.map((row) => row.id));
  return rows.map(({ subtopic, topic, ...row }) => ({
    ...row,
    subtopic: { ...subtopic, topic },
    positions: positionsByQuestion.get(row.id) ?? [],
  }));
}

// Drafts included, in the order of the quiz.
export async function getQuestions(): Promise<EditableQuestion[]> {
  const rows = await db
    .select({
      id: questions.id,
      subtopicId: questions.subtopicId,
      statement: questions.statement,
      status: questions.status,
    })
    .from(questions)
    .innerJoin(subtopics, eq(subtopics.id, questions.subtopicId))
    .innerJoin(topics, eq(topics.id, subtopics.topicId))
    .orderBy(...questionOrder);
  const positionsByQuestion = await positionsOf(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, positions: positionsByQuestion.get(row.id) ?? [] }));
}

// One transaction: the question and its positions are written together or not at all. Placed
// last among the questions of its subtopic.
export async function createQuestion({ positions, ...question }: NewQuestion): Promise<CreateQuestionResult> {
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(questions)
        .values({ ...question, position: nextPosition(question.subtopicId) })
        .returning({ id: questions.id });
      await replacePositions(tx, created.id, positions);
      return { ok: true as const, id: created.id };
    });
  } catch (error) {
    // A subtopic, candidacy or source picked in the form was deleted meanwhile.
    return { ok: false, reason: refusalOf(error, { taken: takenReasons, foreignKey: "not-found" }) };
  }
}

// One transaction, all or nothing. A question moved to another subtopic goes last there.
export async function saveQuestion(id: string, { positions, ...changes }: QuestionChanges): Promise<SaveQuestionResult> {
  try {
    await db.transaction(async (tx) => {
      const [found] = await tx
        .select({ subtopicId: questions.subtopicId })
        .from(questions)
        .where(eq(questions.id, id))
        .for("update");
      if (!found) throw new Refused("not-found");
      const moved = changes.subtopicId !== undefined && changes.subtopicId !== found.subtopicId;
      const values = moved ? { ...changes, position: nextPosition(changes.subtopicId!) } : changes;
      if (Object.keys(values).length > 0) await tx.update(questions).set(values).where(eq(questions.id, id));
      if (positions !== undefined) await replacePositions(tx, id, positions);
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: refusalOf(error, { taken: takenReasons, foreignKey: "not-found" }) };
  }
}

// Within the questions of the same subtopic.
export async function moveQuestion(id: string, direction: Direction): Promise<MoveQuestionResult> {
  return db.transaction(async (tx) => {
    const siblings = await lockSiblings(tx, id);
    const index = siblings.indexOf(id);
    if (index === -1) return { ok: false, reason: "not-found" };
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= siblings.length) return { ok: true, unchanged: true };

    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    // Every sibling is renumbered, which also repairs equal positions left by two creations at once.
    for (const [position, siblingId] of siblings.entries()) {
      await tx.update(questions).set({ position: position + 1 }).where(eq(questions.id, siblingId));
    }
    return { ok: true };
  });
}

// Its positions go with it.
export async function removeQuestion(id: string): Promise<RemoveQuestionResult> {
  const [deleted] = await db.delete(questions).where(eq(questions.id, id)).returning({ id: questions.id });
  return deleted ? { ok: true } : { ok: false, reason: "not-found" };
}

function nextPosition(subtopicId: string) {
  return sql<number>`(select coalesce(max(${questions.position}), 0) + 1 from ${questions}
                      where ${questions.subtopicId} = ${subtopicId})`;
}

// Ids of the question and its siblings in their current order, locked until the transaction
// ends; empty when the question no longer exists.
async function lockSiblings(tx: Transaction, id: string): Promise<string[]> {
  const [moved] = await tx.select({ subtopicId: questions.subtopicId }).from(questions).where(eq(questions.id, id));
  if (!moved) return [];
  const rows = await tx
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.subtopicId, moved.subtopicId))
    .orderBy(asc(questions.position), asc(questions.createdAt))
    .for("update");
  return rows.map((row) => row.id);
}

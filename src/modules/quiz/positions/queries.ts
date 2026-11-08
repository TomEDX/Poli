import { and, asc, eq, inArray, notExists } from "drizzle-orm";

import { db } from "@/lib/db";
import { candidacies, sources, subtopics, topics } from "@/modules/reference/schema";
import { sourceSummaryColumns, type SourceSummary } from "@/modules/reference/sources/queries";

import { positions, questions } from "../schema";
import type { PositionValue } from "./vocabulary";

export type PositionInput = { candidacyId: string; value: PositionValue; sourceId: string | null };

export type PublishedPosition = { candidacyId: string; value: PositionValue; source: SourceSummary | null };

// The candidacies, drafts included, that have no position yet on each question that lacks one.
export type MissingPositions = { questionId: string; candidacyIds: string[] }[];

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// The order of the quiz: the topic tree, then the order the editors gave within each subtopic.
// The same tie-breaks as the topic tree, so every list of questions agrees.
export const questionOrder = [
  asc(topics.position),
  asc(topics.createdAt),
  asc(subtopics.position),
  asc(subtopics.createdAt),
  asc(questions.position),
  asc(questions.createdAt),
];

// The positions of every question follow the order the candidacies were created in.
const candidacyOrder = [asc(candidacies.createdAt), asc(candidacies.id)];

// The position of each published candidacy on each question.
export async function publishedPositionsOf(questionIds: string[]): Promise<Map<string, PublishedPosition[]>> {
  const byQuestion = new Map<string, PublishedPosition[]>();
  if (questionIds.length === 0) return byQuestion;
  const rows = await db
    .select({
      questionId: positions.questionId,
      candidacyId: positions.candidacyId,
      value: positions.value,
      source: sourceSummaryColumns,
    })
    .from(positions)
    .innerJoin(candidacies, eq(candidacies.id, positions.candidacyId))
    .leftJoin(sources, eq(sources.id, positions.sourceId))
    .where(and(inArray(positions.questionId, questionIds), eq(candidacies.status, "published")))
    .orderBy(...candidacyOrder);
  for (const { questionId, value, source, ...position } of rows) {
    const published = { ...position, value: value as PositionValue, source: source?.id ? source : null };
    byQuestion.set(questionId, [...(byQuestion.get(questionId) ?? []), published]);
  }
  return byQuestion;
}

// Every position entered, drafts included, as the administration form edits them.
export async function positionsOf(questionIds: string[]): Promise<Map<string, PositionInput[]>> {
  const byQuestion = new Map<string, PositionInput[]>();
  if (questionIds.length === 0) return byQuestion;
  const rows = await db
    .select({
      questionId: positions.questionId,
      candidacyId: positions.candidacyId,
      value: positions.value,
      sourceId: positions.sourceId,
    })
    .from(positions)
    .innerJoin(candidacies, eq(candidacies.id, positions.candidacyId))
    .where(inArray(positions.questionId, questionIds))
    .orderBy(...candidacyOrder);
  for (const { questionId, value, ...position } of rows) {
    byQuestion.set(questionId, [...(byQuestion.get(questionId) ?? []), { ...position, value: value as PositionValue }]);
  }
  return byQuestion;
}

/**
 * The questions, drafts included, on which a candidacy, drafts included, has no position yet,
 * in the order of the quiz. "No position" is an answer: it does not count as missing.
 */
export async function getMissingPositions(): Promise<MissingPositions> {
  const rows = await db
    .select({ questionId: questions.id, candidacyId: candidacies.id })
    .from(questions)
    .innerJoin(subtopics, eq(subtopics.id, questions.subtopicId))
    .innerJoin(topics, eq(topics.id, subtopics.topicId))
    .crossJoin(candidacies)
    .where(
      notExists(
        db
          .select()
          .from(positions)
          .where(and(eq(positions.questionId, questions.id), eq(positions.candidacyId, candidacies.id))),
      ),
    )
    .orderBy(...questionOrder, ...candidacyOrder);
  const missing: MissingPositions = [];
  for (const { questionId, candidacyId } of rows) {
    const last = missing.at(-1);
    if (last?.questionId === questionId) last.candidacyIds.push(candidacyId);
    else missing.push({ questionId, candidacyIds: [candidacyId] });
  }
  return missing;
}

// Replaces every position of the question with those given, within the caller's transaction.
// A candidacy given twice breaks the unique constraint, a candidacy or source deleted meanwhile
// a foreign key: the caller rolls back and reports it.
export async function replacePositions(tx: Transaction, questionId: string, given: PositionInput[]): Promise<void> {
  await tx.delete(positions).where(eq(positions.questionId, questionId));
  if (given.length === 0) return;
  await tx.insert(positions).values(given.map((position) => ({ ...position, questionId })));
}

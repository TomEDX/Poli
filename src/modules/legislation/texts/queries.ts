import { and, asc, count, desc, eq, exists, inArray, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { refusalOf, Refused } from "@/lib/write-refusals";
import type { WriteOutcome } from "@/modules/editors/editor-write";
import { getCurrentLegislature } from "@/modules/reference/parliamentary-groups/queries";
import type { PublicationStatus } from "@/modules/reference/publication-status";
import { subtopics, topics } from "@/modules/reference/schema";
import type { SourceSummary } from "@/modules/reference/sources/queries";
import { sourceLinks } from "@/modules/reference/sources/links";

import { texts, textSources, textSubtopics } from "../schema";
import type { TextNature } from "./vocabulary";

export type TextInput = {
  nature: TextNature;
  number: number;
  officialTitle: string;
  // ISO date (YYYY-MM-DD): only the day of filing matters.
  filedOn: string;
  officialUrl: string | null;
  summary: string;
  subtopicIds: string[];
  // None on a creation without it.
  sourceIds?: string[];
};

// A new text is a draft unless it is published right away.
export type NewText = TextInput & { status?: PublicationStatus };

// Only the given fields change; subtopicIds or sourceIds, when given, replaces every
// subtopic or source of the text.
export type TextChanges = Partial<TextInput & { status: PublicationStatus }>;

export type TextSubtopic = { id: string; name: string; topic: { id: string; name: string } };

export type PublishedTextSummary = {
  id: string;
  nature: TextNature;
  number: number;
  officialTitle: string;
  filedOn: string;
  subtopics: TextSubtopic[];
};

export type PublishedText = PublishedTextSummary & {
  officialUrl: string | null;
  summary: string;
  sources: SourceSummary[];
};

// By filing date.
export type TextOrder = "newest" | "oldest";

// What a visitor narrows the public list to, every filter given must match, and its order,
// the most recently filed first by default.
export type TextFilters = { topicId?: string; subtopicId?: string; nature?: TextNature; order?: TextOrder };

// A topic a visitor can filter the public list by, with its subtopics that have a published text.
export type TextTopic = { id: string; name: string; slug: string; subtopics: { id: string; name: string; slug: string }[] };

// What the administration lists and edits, drafts included.
export type EditableText = Required<TextInput> & { id: string; status: PublicationStatus };

export type CreateTextResult = { ok: true; id: string } | { ok: false; reason: TextRefusal };

export type SaveTextResult = WriteOutcome<TextRefusal>;

export type RemoveTextResult = WriteOutcome<"not-found">;

type TextRefusal = "number-taken" | "no-subtopic" | "not-found";

const takenReasons: Record<string, TextRefusal> = { texts_legislature_id_number_unique: "number-taken" };

const textSourceLinks = sourceLinks(textSources, "textId");

const summaryColumns = {
  id: texts.id,
  nature: texts.nature,
  number: texts.number,
  officialTitle: texts.officialTitle,
  filedOn: texts.filedOn,
};

const editableColumns = {
  ...summaryColumns,
  officialUrl: texts.officialUrl,
  summary: texts.summary,
  status: texts.status,
};

// The number breaks a tie within a day.
const filingOrder = [desc(texts.filedOn), desc(texts.number)];
const reverseFilingOrder = [asc(texts.filedOn), asc(texts.number)];

export async function getPublishedTexts(filters: TextFilters = {}): Promise<PublishedTextSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(texts)
    .where(and(eq(texts.status, "published"), ...filterConditions(filters)))
    .orderBy(...(filters.order === "oldest" ? reverseFilingOrder : filingOrder));
  const subtopicsByText = await subtopicsOf(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, subtopics: subtopicsByText.get(row.id) ?? [] }));
}

export async function countPublishedTexts(): Promise<number> {
  const [{ total }] = await db.select({ total: count() }).from(texts).where(eq(texts.status, "published"));
  return total;
}

// Only what has a published text: a filter that can only empty the list is not offered.
export async function getPublishedTextTopics(): Promise<TextTopic[]> {
  const rows = await db
    .selectDistinct({
      topic: { id: topics.id, name: topics.name, slug: topics.slug, position: topics.position },
      subtopic: { id: subtopics.id, name: subtopics.name, slug: subtopics.slug, position: subtopics.position },
    })
    .from(textSubtopics)
    .innerJoin(texts, and(eq(texts.id, textSubtopics.textId), eq(texts.status, "published")))
    .innerJoin(subtopics, eq(subtopics.id, textSubtopics.subtopicId))
    .innerJoin(topics, eq(topics.id, subtopics.topicId))
    .orderBy(asc(topics.position), asc(subtopics.position));
  const tree = new Map<string, TextTopic>();
  for (const { topic, subtopic } of rows) {
    const entry = tree.get(topic.id) ?? { id: topic.id, name: topic.name, slug: topic.slug, subtopics: [] };
    entry.subtopics.push({ id: subtopic.id, name: subtopic.name, slug: subtopic.slug });
    tree.set(topic.id, entry);
  }
  return [...tree.values()];
}

// Null for a draft as for a text that does not exist: the public cannot tell them apart.
// The id comes from the URL, so anything but a uuid is a text that does not exist.
export async function getPublishedText(id: string): Promise<PublishedText | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const [row] = await db
    .select({ ...summaryColumns, officialUrl: texts.officialUrl, summary: texts.summary })
    .from(texts)
    .where(and(eq(texts.id, id), eq(texts.status, "published")));
  if (!row) return null;
  const [subtopicsByText, sourcesByText] = await Promise.all([subtopicsOf([id]), textSourceLinks.sourcesOf([id])]);
  return { ...row, subtopics: subtopicsByText.get(id) ?? [], sources: sourcesByText.get(id) ?? [] };
}

export async function getTexts(): Promise<EditableText[]> {
  const rows = await db.select(editableColumns).from(texts).orderBy(...filingOrder);
  return withLinkIds(rows);
}

// A draft too; null for a text that does not exist. The id comes from the URL, so anything
// but a uuid is a text that does not exist.
export async function getText(id: string): Promise<EditableText | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const [text] = await withLinkIds(await db.select(editableColumns).from(texts).where(eq(texts.id, id)));
  return text ?? null;
}

export async function createText({ subtopicIds, sourceIds = [], ...text }: NewText): Promise<CreateTextResult> {
  if (text.status === "published" && subtopicIds.length === 0) return { ok: false, reason: "no-subtopic" };
  const legislature = await getCurrentLegislature();
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(texts)
        .values({ ...text, legislatureId: legislature.id })
        .returning({ id: texts.id });
      if (subtopicIds.length > 0) {
        await tx.insert(textSubtopics).values(subtopicIds.map((subtopicId) => ({ textId: created.id, subtopicId })));
      }
      await textSourceLinks.replace(tx, created.id, sourceIds);
      return { ok: true as const, id: created.id };
    });
  } catch (error) {
    return { ok: false, reason: refusalOf(error, { taken: takenReasons, foreignKey: "not-found" }) };
  }
}

// One transaction: the text, its subtopics and its sources are written together or not at
// all, and a published text is checked to keep a subtopic once everything is written.
export async function saveText(id: string, { subtopicIds, sourceIds, ...text }: TextChanges): Promise<SaveTextResult> {
  try {
    await db.transaction(async (tx) => {
      // Locks the text, so that two saves at once cannot leave it published without a subtopic.
      const [found] =
        Object.keys(text).length > 0
          ? await tx.update(texts).set(text).where(eq(texts.id, id)).returning({ status: texts.status })
          : await tx.select({ status: texts.status }).from(texts).where(eq(texts.id, id)).for("update");
      if (!found) throw new Refused("not-found");
      if (subtopicIds !== undefined) {
        await tx.delete(textSubtopics).where(eq(textSubtopics.textId, id));
        if (subtopicIds.length > 0) {
          await tx.insert(textSubtopics).values(subtopicIds.map((subtopicId) => ({ textId: id, subtopicId })));
        }
      }
      if (sourceIds !== undefined) await textSourceLinks.replace(tx, id, sourceIds);
      if (found.status !== "published") return;
      const [{ subtopicCount }] = await tx
        .select({ subtopicCount: count() })
        .from(textSubtopics)
        .where(eq(textSubtopics.textId, id));
      if (subtopicCount === 0) throw new Refused("no-subtopic");
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: refusalOf(error, { taken: takenReasons, foreignKey: "not-found" }) };
  }
}

export async function removeText(id: string): Promise<RemoveTextResult> {
  const [deleted] = await db.delete(texts).where(eq(texts.id, id)).returning({ id: texts.id });
  return deleted ? { ok: true } : { ok: false, reason: "not-found" };
}

function filterConditions({ topicId, subtopicId, nature }: TextFilters): SQL[] {
  const conditions: SQL[] = [];
  if (nature) conditions.push(eq(texts.nature, nature));
  if (topicId) {
    conditions.push(
      exists(
        db
          .select()
          .from(textSubtopics)
          .innerJoin(subtopics, eq(subtopics.id, textSubtopics.subtopicId))
          .where(and(eq(textSubtopics.textId, texts.id), eq(subtopics.topicId, topicId))),
      ),
    );
  }
  if (subtopicId) {
    conditions.push(
      exists(
        db
          .select()
          .from(textSubtopics)
          .where(and(eq(textSubtopics.textId, texts.id), eq(textSubtopics.subtopicId, subtopicId))),
      ),
    );
  }
  return conditions;
}

async function withLinkIds<Row extends { id: string }>(
  rows: Row[],
): Promise<(Row & { subtopicIds: string[]; sourceIds: string[] })[]> {
  const ids = rows.map((row) => row.id);
  const [subtopicsByText, sourceIdsByText] = await Promise.all([subtopicsOf(ids), textSourceLinks.sourceIdsOf(ids)]);
  return rows.map((row) => ({
    ...row,
    subtopicIds: (subtopicsByText.get(row.id) ?? []).map((subtopic) => subtopic.id),
    sourceIds: sourceIdsByText.get(row.id) ?? [],
  }));
}

// The subtopics of each text, in the order of the topic tree.
async function subtopicsOf(textIds: string[]): Promise<Map<string, TextSubtopic[]>> {
  const byText = new Map<string, TextSubtopic[]>();
  if (textIds.length === 0) return byText;
  const rows = await db
    .select({
      textId: textSubtopics.textId,
      id: subtopics.id,
      name: subtopics.name,
      topic: { id: topics.id, name: topics.name },
    })
    .from(textSubtopics)
    .innerJoin(subtopics, eq(subtopics.id, textSubtopics.subtopicId))
    .innerJoin(topics, eq(topics.id, subtopics.topicId))
    .where(inArray(textSubtopics.textId, textIds))
    .orderBy(asc(topics.position), asc(subtopics.position));
  for (const { textId, ...subtopic } of rows) byText.set(textId, [...(byText.get(textId) ?? []), subtopic]);
  return byText;
}

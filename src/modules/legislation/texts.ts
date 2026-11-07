import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import type { WriteOutcome } from "@/modules/editors/editor-write";
import { getCurrentLegislature } from "@/modules/reference/parliamentary-groups";
import { foreignKeyViolation, postgresError, uniqueViolation } from "@/modules/reference/postgres-errors";
import type { PublicationStatus } from "@/modules/reference/publication-status";
import { subtopics, topics } from "@/modules/reference/schema";

import { textSubtopics, texts } from "./schema";
import type { TextNature } from "./text-natures";

export type TextInput = {
  nature: TextNature;
  number: number;
  officialTitle: string;
  // ISO date (YYYY-MM-DD): only the day of filing matters.
  filedOn: string;
  officialUrl: string | null;
  summary: string;
  subtopicIds: string[];
};

// A new text is a draft unless it is published right away.
export type NewText = TextInput & { status?: PublicationStatus };

// Only the given fields change; subtopicIds, when given, replaces every subtopic of the text.
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

export type PublishedText = PublishedTextSummary & { officialUrl: string | null; summary: string };

// What the administration lists and edits, drafts included.
export type Text = TextInput & { id: string; status: PublicationStatus };

export type CreateTextResult = { ok: true; id: string } | { ok: false; reason: TextRefusal };

export type SaveTextResult = WriteOutcome<TextRefusal>;

export type RemoveTextResult = WriteOutcome<"not-found">;

type TextRefusal = "number-taken" | "no-subtopic" | "not-found";

// Thrown inside a transaction to roll it back with the reason the editor will read.
class Refused extends Error {
  constructor(readonly reason: TextRefusal) {
    super(reason);
  }
}

const summaryColumns = {
  id: texts.id,
  nature: texts.nature,
  number: texts.number,
  officialTitle: texts.officialTitle,
  filedOn: texts.filedOn,
};

// The most recently filed first; the number breaks a tie within a day.
const filingOrder = [desc(texts.filedOn), desc(texts.number)];

export async function getPublishedTexts(): Promise<PublishedTextSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(texts)
    .where(eq(texts.status, "published"))
    .orderBy(...filingOrder);
  const filed = await subtopicsOf(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, subtopics: filed.get(row.id) ?? [] }));
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
  const filed = await subtopicsOf([id]);
  return { ...row, subtopics: filed.get(id) ?? [] };
}

export async function getTexts(): Promise<Text[]> {
  const rows = await db
    .select({
      ...summaryColumns,
      officialUrl: texts.officialUrl,
      summary: texts.summary,
      status: texts.status,
    })
    .from(texts)
    .orderBy(...filingOrder);
  const filed = await subtopicsOf(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, subtopicIds: (filed.get(row.id) ?? []).map((subtopic) => subtopic.id) }));
}

export async function createText({ subtopicIds, ...text }: NewText): Promise<CreateTextResult> {
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
      return { ok: true as const, id: created.id };
    });
  } catch (error) {
    return { ok: false, reason: refusal(error) };
  }
}

// One transaction: the text and its subtopics are written together or not at all, and a
// published text is checked to keep a subtopic once everything is written.
export async function saveText(id: string, { subtopicIds, ...text }: TextChanges): Promise<SaveTextResult> {
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
      if (found.status !== "published") return;
      const [{ filed }] = await tx
        .select({ filed: count() })
        .from(textSubtopics)
        .where(eq(textSubtopics.textId, id));
      if (filed === 0) throw new Refused("no-subtopic");
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: refusal(error) };
  }
}

export async function removeText(id: string): Promise<RemoveTextResult> {
  const [deleted] = await db.delete(texts).where(eq(texts.id, id)).returning({ id: texts.id });
  return deleted ? { ok: true } : { ok: false, reason: "not-found" };
}

// The subtopics of each text, in the order of the topic tree.
async function subtopicsOf(textIds: string[]): Promise<Map<string, TextSubtopic[]>> {
  const filed = new Map<string, TextSubtopic[]>();
  if (textIds.length === 0) return filed;
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
  for (const { textId, ...subtopic } of rows) filed.set(textId, [...(filed.get(textId) ?? []), subtopic]);
  return filed;
}

// Rethrows anything the editor cannot act on.
function refusal(error: unknown): TextRefusal {
  if (error instanceof Refused) return error.reason;
  const { code, constraint } = postgresError(error);
  if (code === uniqueViolation && constraint === "texts_legislature_id_number_unique") return "number-taken";
  // A subtopic picked by the editor was deleted meanwhile.
  if (code === foreignKeyViolation) return "not-found";
  throw error;
}

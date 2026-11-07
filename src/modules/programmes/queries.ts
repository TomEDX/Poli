import { and, asc, eq, inArray, notExists, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import type { Direction } from "@/lib/direction";
import { Refused, refusalOf } from "@/lib/write-refusals";
import type { WriteOutcome } from "@/modules/editors/editor-write";
import type { PublicationStatus } from "@/modules/reference/publication-status";
import { candidacies, sources, subtopics, topics } from "@/modules/reference/schema";
import { sourceOrder, sourceSummaryColumns, type SourceSummary } from "@/modules/reference/sources/queries";

import { extractSources, extracts } from "./schema";

export type ExtractInput = {
  subtopicId: string;
  // Word for word, as the programme states it.
  quote: string;
  // ISO date (YYYY-MM-DD): the day the quote was read in the programme.
  recordedOn: string;
  sourceIds: string[];
};

// A new extract is a draft unless it is published right away.
export type NewExtract = ExtractInput & { status?: PublicationStatus };

// Only the given fields change; sourceIds, when given, replaces every source of the extract.
export type ExtractChanges = Partial<NewExtract>;

export type ExtractSubtopic = { id: string; name: string; topic: { id: string; name: string } };

export type PublishedExtract = {
  id: string;
  quote: string;
  recordedOn: string;
  subtopic: ExtractSubtopic;
  sources: SourceSummary[];
};

// What the administration lists and edits, drafts included.
export type EditableExtract = ExtractInput & { id: string; status: PublicationStatus };

// What remains to read in the programme, grouped by topic; a topic with nothing left is omitted.
export type MissingSubtopics = { id: string; name: string; subtopics: { id: string; name: string }[] }[];

export type CreateExtractResult = { ok: true; id: string } | { ok: false; reason: "not-found" };

export type SaveExtractResult = WriteOutcome<"not-found">;

export type MoveExtractResult = WriteOutcome<"not-found">;

export type RemoveExtractResult = WriteOutcome<"not-found">;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// The order of the topic tree, then the order the editors gave within each subtopic.
// The same tie-breaks as the topic tree, so the programme and the missing subtopics agree.
const treeOrder = [asc(topics.position), asc(topics.createdAt), asc(subtopics.position), asc(subtopics.createdAt)];
const programmeOrder = [...treeOrder, asc(extracts.position), asc(extracts.createdAt)];

/**
 * The programme of a published candidacy: its published extracts, in the order of the topic
 * tree. Empty for a draft candidacy as for one that does not exist; the id may come from a
 * URL, so anything but a uuid is a candidacy that does not exist.
 */
export async function getPublishedProgramme(candidacyId: string): Promise<PublishedExtract[]> {
  if (!z.uuid().safeParse(candidacyId).success) return [];
  const rows = await db
    .select({
      id: extracts.id,
      quote: extracts.quote,
      recordedOn: extracts.recordedOn,
      subtopic: { id: subtopics.id, name: subtopics.name },
      topic: { id: topics.id, name: topics.name },
    })
    .from(extracts)
    .innerJoin(candidacies, eq(candidacies.id, extracts.candidacyId))
    .innerJoin(subtopics, eq(subtopics.id, extracts.subtopicId))
    .innerJoin(topics, eq(topics.id, subtopics.topicId))
    .where(
      and(
        eq(extracts.candidacyId, candidacyId),
        eq(extracts.status, "published"),
        eq(candidacies.status, "published"),
      ),
    )
    .orderBy(...programmeOrder);
  const sourcesByExtract = await sourcesOf(rows.map((row) => row.id));
  return rows.map(({ subtopic, topic, ...row }) => ({
    ...row,
    subtopic: { ...subtopic, topic },
    sources: sourcesByExtract.get(row.id) ?? [],
  }));
}

// Drafts included, in the order of the programme.
export async function getExtracts(candidacyId: string): Promise<EditableExtract[]> {
  const rows = await db
    .select({
      id: extracts.id,
      subtopicId: extracts.subtopicId,
      quote: extracts.quote,
      recordedOn: extracts.recordedOn,
      status: extracts.status,
    })
    .from(extracts)
    .innerJoin(subtopics, eq(subtopics.id, extracts.subtopicId))
    .innerJoin(topics, eq(topics.id, subtopics.topicId))
    .where(eq(extracts.candidacyId, candidacyId))
    .orderBy(...programmeOrder);
  const sourcesByExtract = await sourcesOf(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    sourceIds: (sourcesByExtract.get(row.id) ?? []).map((source) => source.id),
  }));
}

// A draft extract counts: the subtopic has been read, even if nothing is published yet.
export async function getSubtopicsWithoutExtract(candidacyId: string): Promise<MissingSubtopics> {
  const rows = await db
    .select({
      topic: { id: topics.id, name: topics.name },
      subtopic: { id: subtopics.id, name: subtopics.name },
    })
    .from(subtopics)
    .innerJoin(topics, eq(topics.id, subtopics.topicId))
    .where(
      notExists(
        db
          .select()
          .from(extracts)
          .where(and(eq(extracts.subtopicId, subtopics.id), eq(extracts.candidacyId, candidacyId))),
      ),
    )
    .orderBy(...treeOrder);
  const tree = new Map<string, MissingSubtopics[number]>();
  for (const { topic, subtopic } of rows) {
    const entry = tree.get(topic.id) ?? { ...topic, subtopics: [] };
    entry.subtopics.push(subtopic);
    tree.set(topic.id, entry);
  }
  return [...tree.values()];
}

// Placed last among the extracts of the candidacy in its subtopic.
export async function createExtract(
  candidacyId: string,
  { sourceIds, ...extract }: NewExtract,
): Promise<CreateExtractResult> {
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(extracts)
        .values({ ...extract, candidacyId, position: nextPosition(candidacyId, extract.subtopicId) })
        .returning({ id: extracts.id });
      await replaceSources(tx, created.id, sourceIds);
      return { ok: true as const, id: created.id };
    });
  } catch (error) {
    // A subtopic or source picked in the form was deleted meanwhile.
    return { ok: false, reason: refusalOf(error, { foreignKey: "not-found" }) };
  }
}

// One transaction: the extract and its sources are written together or not at all. An edit
// overwrites the previous version; an extract moved to another subtopic goes last there.
export async function saveExtract(id: string, { sourceIds, ...changes }: ExtractChanges): Promise<SaveExtractResult> {
  try {
    await db.transaction(async (tx) => {
      const [found] = await tx
        .select({ candidacyId: extracts.candidacyId, subtopicId: extracts.subtopicId })
        .from(extracts)
        .where(eq(extracts.id, id))
        .for("update");
      if (!found) throw new Refused("not-found");
      const moved = changes.subtopicId !== undefined && changes.subtopicId !== found.subtopicId;
      const values = moved ? { ...changes, position: nextPosition(found.candidacyId, changes.subtopicId!) } : changes;
      if (Object.keys(values).length > 0) await tx.update(extracts).set(values).where(eq(extracts.id, id));
      if (sourceIds !== undefined) await replaceSources(tx, id, sourceIds);
    });
    return { ok: true };
  } catch (error) {
    // The extract, or a subtopic or source picked in the form, was deleted meanwhile.
    return { ok: false, reason: refusalOf(error, { foreignKey: "not-found" }) };
  }
}

// Within the extracts of the same candidacy and subtopic, the ones the comparator shows together.
export async function moveExtract(id: string, direction: Direction): Promise<MoveExtractResult> {
  return db.transaction(async (tx) => {
    const siblings = await lockSiblings(tx, id);
    const index = siblings.indexOf(id);
    if (index === -1) return { ok: false, reason: "not-found" };
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= siblings.length) return { ok: true, unchanged: true };

    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    // Every sibling is renumbered, which also repairs equal positions left by two creations at once.
    for (const [position, siblingId] of siblings.entries()) {
      await tx.update(extracts).set({ position: position + 1 }).where(eq(extracts.id, siblingId));
    }
    return { ok: true };
  });
}

export async function removeExtract(id: string): Promise<RemoveExtractResult> {
  const [deleted] = await db.delete(extracts).where(eq(extracts.id, id)).returning({ id: extracts.id });
  return deleted ? { ok: true } : { ok: false, reason: "not-found" };
}

function nextPosition(candidacyId: string, subtopicId: string) {
  return sql<number>`(select coalesce(max(${extracts.position}), 0) + 1 from ${extracts}
                      where ${extracts.candidacyId} = ${candidacyId} and ${extracts.subtopicId} = ${subtopicId})`;
}

// Ids of the extract and its siblings in their current order, locked until the transaction
// ends; empty when the extract no longer exists.
async function lockSiblings(tx: Transaction, id: string): Promise<string[]> {
  const [moved] = await tx
    .select({ candidacyId: extracts.candidacyId, subtopicId: extracts.subtopicId })
    .from(extracts)
    .where(eq(extracts.id, id));
  if (!moved) return [];
  const rows = await tx
    .select({ id: extracts.id })
    .from(extracts)
    .where(and(eq(extracts.candidacyId, moved.candidacyId), eq(extracts.subtopicId, moved.subtopicId)))
    .orderBy(asc(extracts.position), asc(extracts.createdAt))
    .for("update");
  return rows.map((row) => row.id);
}

async function replaceSources(tx: Transaction, extractId: string, sourceIds: string[]) {
  await tx.delete(extractSources).where(eq(extractSources.extractId, extractId));
  if (sourceIds.length > 0) {
    await tx.insert(extractSources).values(sourceIds.map((sourceId) => ({ extractId, sourceId })));
  }
}

// The sources of each extract, as the Sources page sorts them.
async function sourcesOf(extractIds: string[]): Promise<Map<string, SourceSummary[]>> {
  const byExtract = new Map<string, SourceSummary[]>();
  if (extractIds.length === 0) return byExtract;
  const rows = await db
    .select({ extractId: extractSources.extractId, source: sourceSummaryColumns })
    .from(extractSources)
    .innerJoin(sources, eq(sources.id, extractSources.sourceId))
    .where(inArray(extractSources.extractId, extractIds))
    .orderBy(...sourceOrder, asc(sources.id));
  for (const { extractId, source } of rows) byExtract.set(extractId, [...(byExtract.get(extractId) ?? []), source]);
  return byExtract;
}

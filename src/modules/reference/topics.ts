import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { subtopics, topics } from "./schema";

export type TopicInput = { name: string; slug: string };

export type Direction = "up" | "down";

export type WriteResult =
  | { ok: true; id: string }
  | { ok: false; reason: "slug-taken" | "not-found" };

export type DeleteResult = { ok: true } | { ok: false; reason: "in-use" | "not-found" };

const uniqueViolation = "23505";
const foreignKeyViolation = "23503";

// Drizzle wraps the driver error and keeps the Postgres one as its cause.
function postgresCode(error: unknown): string | undefined {
  const { cause, code } = error as { cause?: { code?: string }; code?: string };
  return cause?.code ?? code;
}

async function write(run: () => Promise<{ id: string } | undefined>): Promise<WriteResult> {
  try {
    const row = await run();
    return row ? { ok: true, id: row.id } : { ok: false, reason: "not-found" };
  } catch (error) {
    const code = postgresCode(error);
    if (code === uniqueViolation) return { ok: false, reason: "slug-taken" };
    // On a write, a missing reference means the parent topic was deleted meanwhile.
    if (code === foreignKeyViolation) return { ok: false, reason: "not-found" };
    throw error;
  }
}

async function remove(run: () => Promise<{ id: string } | undefined>): Promise<DeleteResult> {
  try {
    return (await run()) ? { ok: true } : { ok: false, reason: "not-found" };
  } catch (error) {
    // On a delete, a reference that blocks it is content still filed under the subtopic.
    if (postgresCode(error) === foreignKeyViolation) return { ok: false, reason: "in-use" };
    throw error;
  }
}

export type TopicTree = {
  id: string;
  name: string;
  slug: string;
  subtopics: { id: string; name: string; slug: string }[];
}[];

export async function getTopicTree(): Promise<TopicTree> {
  const topicRows = await db
    .select({ id: topics.id, name: topics.name, slug: topics.slug })
    .from(topics)
    .orderBy(asc(topics.position), asc(topics.createdAt));
  const subtopicRows = await db
    .select({ id: subtopics.id, topicId: subtopics.topicId, name: subtopics.name, slug: subtopics.slug })
    .from(subtopics)
    .orderBy(asc(subtopics.position), asc(subtopics.createdAt));

  return topicRows.map((topic) => ({
    ...topic,
    subtopics: subtopicRows
      .filter((subtopic) => subtopic.topicId === topic.id)
      .map(({ id, name, slug }) => ({ id, name, slug })),
  }));
}

export async function createTopic(input: TopicInput): Promise<WriteResult> {
  return write(async () => {
    const [created] = await db
      .insert(topics)
      .values({
        ...input,
        position: sql`(select coalesce(max(${topics.position}), 0) + 1 from ${topics})`,
      })
      .returning({ id: topics.id });
    return created;
  });
}

export async function renameSubtopic(id: string, input: TopicInput): Promise<WriteResult> {
  return write(async () => {
    const [renamed] = await db
      .update(subtopics)
      .set(input)
      .where(eq(subtopics.id, id))
      .returning({ id: subtopics.id });
    return renamed;
  });
}

export async function moveSubtopic(id: string, direction: Direction) {
  await db.transaction(async (tx) => {
    const [moved] = await tx
      .select({ topicId: subtopics.topicId })
      .from(subtopics)
      .where(eq(subtopics.id, id));
    if (!moved) return;
    const siblings = await tx
      .select({ id: subtopics.id })
      .from(subtopics)
      .where(eq(subtopics.topicId, moved.topicId))
      .orderBy(asc(subtopics.position), asc(subtopics.createdAt))
      .for("update");
    for (const [index, siblingId] of reorder(siblings, id, direction).entries()) {
      await tx.update(subtopics).set({ position: index + 1 }).where(eq(subtopics.id, siblingId));
    }
  });
}

export async function renameTopic(id: string, input: TopicInput): Promise<WriteResult> {
  return write(async () => {
    const [renamed] = await db
      .update(topics)
      .set(input)
      .where(eq(topics.id, id))
      .returning({ id: topics.id });
    return renamed;
  });
}

export async function createSubtopic(topicId: string, input: TopicInput): Promise<WriteResult> {
  return write(async () => {
    const [created] = await db
      .insert(subtopics)
      .values({
        ...input,
        topicId,
        position: sql`(select coalesce(max(${subtopics.position}), 0) + 1 from ${subtopics}
                       where ${subtopics.topicId} = ${topicId})`,
      })
      .returning({ id: subtopics.id });
    return created;
  });
}

export async function moveTopic(id: string, direction: Direction) {
  await db.transaction(async (tx) => {
    const siblings = await tx
      .select({ id: topics.id })
      .from(topics)
      .orderBy(asc(topics.position), asc(topics.createdAt))
      .for("update");
    for (const [index, siblingId] of reorder(siblings, id, direction).entries()) {
      await tx.update(topics).set({ position: index + 1 }).where(eq(topics.id, siblingId));
    }
  });
}

export async function deleteTopic(id: string): Promise<DeleteResult> {
  return remove(async () => {
    const [deleted] = await db.delete(topics).where(eq(topics.id, id)).returning({ id: topics.id });
    return deleted;
  });
}

export async function deleteSubtopic(id: string): Promise<DeleteResult> {
  return remove(async () => {
    const [deleted] = await db
      .delete(subtopics)
      .where(eq(subtopics.id, id))
      .returning({ id: subtopics.id });
    return deleted;
  });
}

// Returns the ids in their new order. Every sibling is renumbered, which also
// repairs equal positions left by two creations at the same time.
function reorder(siblings: { id: string }[], id: string, direction: Direction): string[] {
  const ids = siblings.map((sibling) => sibling.id);
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ids.length) return ids;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return ids;
}

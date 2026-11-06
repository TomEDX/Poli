import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { subtopics, topics } from "./schema";

export type Level = "topic" | "subtopic";

// A topic or a subtopic: edits, moves and deletions work the same on both levels.
export type TopicNode = { level: Level; id: string };

export type TopicInput = { name: string; slug: string };

export type TopicChanges = { name?: string; slug?: string };

export type Direction = "up" | "down";

export type CreateResult = { ok: true; id: string } | { ok: false; reason: "slug-taken" | "not-found" };

// unchanged tells the caller that nothing was written, so public pages need no regeneration.
export type TreeResult =
  | { ok: true; unchanged?: true }
  | { ok: false; reason: "slug-taken" | "not-found" | "in-use" };

const uniqueViolation = "23505";
const foreignKeyViolation = "23503";

// Drizzle wraps the driver error and keeps the Postgres one as its cause.
function postgresCode(error: unknown): string | undefined {
  const { cause, code } = error as { cause?: { code?: string }; code?: string };
  return cause?.code ?? code;
}

async function write(run: () => Promise<{ id: string } | undefined>): Promise<CreateResult> {
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

export async function createTopic(input: TopicInput): Promise<CreateResult> {
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

export async function createSubtopic(topicId: string, input: TopicInput): Promise<CreateResult> {
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

// Only the given fields are written, so an edit never brings back a value another editor changed.
export async function editNode(node: TopicNode, changes: TopicChanges): Promise<TreeResult> {
  if (changes.name === undefined && changes.slug === undefined) throw new Error("An edit needs a name or a slug.");
  const result = await write(async () => {
    if (node.level === "topic") {
      const [edited] = await db.update(topics).set(changes).where(eq(topics.id, node.id)).returning({ id: topics.id });
      return edited;
    }
    const [edited] = await db
      .update(subtopics)
      .set(changes)
      .where(eq(subtopics.id, node.id))
      .returning({ id: subtopics.id });
    return edited;
  });
  return result.ok ? { ok: true } : result;
}

export async function moveNode(node: TopicNode, direction: Direction): Promise<TreeResult> {
  return db.transaction(async (tx) => {
    let siblings: { id: string }[];
    if (node.level === "topic") {
      siblings = await tx
        .select({ id: topics.id })
        .from(topics)
        .orderBy(asc(topics.position), asc(topics.createdAt))
        .for("update");
    } else {
      const [moved] = await tx
        .select({ topicId: subtopics.topicId })
        .from(subtopics)
        .where(eq(subtopics.id, node.id));
      if (!moved) return { ok: false, reason: "not-found" };
      siblings = await tx
        .select({ id: subtopics.id })
        .from(subtopics)
        .where(eq(subtopics.topicId, moved.topicId))
        .orderBy(asc(subtopics.position), asc(subtopics.createdAt))
        .for("update");
    }

    const ids = siblings.map((sibling) => sibling.id);
    const index = ids.indexOf(node.id);
    if (index === -1) return { ok: false, reason: "not-found" };
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= ids.length) return { ok: true, unchanged: true };
    [ids[index], ids[target]] = [ids[target], ids[index]];

    // Every sibling is renumbered, which also repairs equal positions left by two
    // creations at the same time.
    for (const [position, id] of ids.entries()) {
      if (node.level === "topic") await tx.update(topics).set({ position: position + 1 }).where(eq(topics.id, id));
      else await tx.update(subtopics).set({ position: position + 1 }).where(eq(subtopics.id, id));
    }
    return { ok: true };
  });
}

// Deleting a topic deletes its subtopics too.
export async function removeNode(node: TopicNode): Promise<TreeResult> {
  try {
    const [deleted] =
      node.level === "topic"
        ? await db.delete(topics).where(eq(topics.id, node.id)).returning({ id: topics.id })
        : await db.delete(subtopics).where(eq(subtopics.id, node.id)).returning({ id: subtopics.id });
    return deleted ? { ok: true } : { ok: false, reason: "not-found" };
  } catch (error) {
    // On a delete, a reference that blocks it is content still filed under a subtopic.
    if (postgresCode(error) === foreignKeyViolation) return { ok: false, reason: "in-use" };
    throw error;
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { editorAction } from "@/modules/editors/authorization";

import {
  createSubtopic,
  createTopic,
  type DeleteResult,
  deleteSubtopic,
  deleteTopic,
  type Direction,
  moveSubtopic,
  moveTopic,
  renameSubtopic,
  renameTopic,
  type TopicInput,
  type WriteResult,
} from "./topics";
import { topicFormSchema } from "./validation";

export type ActionResult = { ok: true } | { ok: false; message: string };

const idSchema = z.uuid();
const directionSchema = z.enum(["up", "down"]);

const goneMessage = "Cet élément n'existe plus : rechargez la page.";
const invalidRequest: ActionResult = { ok: false, message: "Requête invalide : rechargez la page." };
const topicSlugTaken = (slug: string) => `L'identifiant « ${slug} » est déjà pris par une autre thématique.`;
const subtopicSlugTaken = (slug: string) =>
  `L'identifiant « ${slug} » est déjà pris par une autre sous-thématique de cette thématique.`;

// Topics feed every public page, which are regenerated after each change (ADR 0005).
function regeneratePublicPages() {
  revalidatePath("/", "layout");
}

// Server Actions receive whatever the client sends: ids are checked before any query.
async function withId(rawId: unknown, run: (id: string) => Promise<ActionResult>): Promise<ActionResult> {
  const parsed = idSchema.safeParse(rawId);
  return parsed.success ? run(parsed.data) : invalidRequest;
}

async function save(
  values: unknown,
  write: (input: TopicInput) => Promise<WriteResult>,
  slugTakenMessage: (slug: string) => string,
): Promise<ActionResult> {
  const parsed = topicFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const result = await write(parsed.data);
  if (!result.ok) {
    return { ok: false, message: result.reason === "slug-taken" ? slugTakenMessage(parsed.data.slug) : goneMessage };
  }
  regeneratePublicPages();
  return { ok: true };
}

async function remove(result: DeleteResult, inUseMessage: string): Promise<ActionResult> {
  if (!result.ok) return { ok: false, message: result.reason === "in-use" ? inUseMessage : goneMessage };
  regeneratePublicPages();
  return { ok: true };
}

async function move(rawDirection: unknown, run: (direction: Direction) => Promise<void>): Promise<ActionResult> {
  const direction = directionSchema.safeParse(rawDirection);
  if (!direction.success) return invalidRequest;
  await run(direction.data);
  regeneratePublicPages();
  return { ok: true };
}

export const createTopicAction = editorAction(async (_editor, values: TopicInput) =>
  save(values, createTopic, topicSlugTaken),
);

export const renameTopicAction = editorAction(async (_editor, topicId: string, values: TopicInput) =>
  withId(topicId, (id) => save(values, (input) => renameTopic(id, input), topicSlugTaken)),
);

export const moveTopicAction = editorAction(async (_editor, topicId: string, direction: Direction) =>
  withId(topicId, (id) => move(direction, (checked) => moveTopic(id, checked))),
);

export const deleteTopicAction = editorAction(async (_editor, topicId: string) =>
  withId(topicId, async (id) =>
    remove(
      await deleteTopic(id),
      "Une de ses sous-thématiques est utilisée par du contenu : rattachez ce contenu à une autre sous-thématique avant de supprimer la thématique.",
    ),
  ),
);

export const createSubtopicAction = editorAction(async (_editor, topicId: string, values: TopicInput) =>
  withId(topicId, (id) => save(values, (input) => createSubtopic(id, input), subtopicSlugTaken)),
);

export const renameSubtopicAction = editorAction(async (_editor, subtopicId: string, values: TopicInput) =>
  withId(subtopicId, (id) => save(values, (input) => renameSubtopic(id, input), subtopicSlugTaken)),
);

export const moveSubtopicAction = editorAction(async (_editor, subtopicId: string, direction: Direction) =>
  withId(subtopicId, (id) => move(direction, (checked) => moveSubtopic(id, checked))),
);

export const deleteSubtopicAction = editorAction(async (_editor, subtopicId: string) =>
  withId(subtopicId, async (id) =>
    remove(
      await deleteSubtopic(id),
      "Cette sous-thématique est utilisée par du contenu : rattachez ce contenu à une autre sous-thématique avant de la supprimer.",
    ),
  ),
);

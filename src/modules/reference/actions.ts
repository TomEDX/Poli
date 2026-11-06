"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { editorAction } from "@/modules/editors/authorization";

import {
  createSubtopic,
  createTopic,
  type CreateResult,
  editNode,
  moveNode,
  removeNode,
  type TopicNode,
  type TreeResult,
} from "./topics";
import { directionSchema, newTopicSchema, topicChangesSchema, topicNodeSchema } from "./validation";

export type ActionResult = { ok: true } | { ok: false; message: string };

const invalidRequest: ActionResult = { ok: false, message: "Requête invalide : rechargez la page." };

function slugTakenMessage(level: TopicNode["level"], slug: string | undefined) {
  return level === "topic"
    ? `L'identifiant « ${slug} » est déjà pris par une autre thématique.`
    : `L'identifiant « ${slug} » est déjà pris par une autre sous-thématique de cette thématique.`;
}

const messages = {
  "not-found": "Cet élément n'existe plus : rechargez la page.",
  "in-use": {
    topic:
      "Une de ses sous-thématiques est utilisée par du contenu : rattachez ce contenu à une autre sous-thématique avant de supprimer la thématique.",
    subtopic:
      "Cette sous-thématique est utilisée par du contenu : rattachez ce contenu à une autre sous-thématique avant de la supprimer.",
  },
};

// Topics feed every public page, which are regenerated after each change (ADR 0005).
function regeneratePublicPages() {
  revalidatePath("/", "layout");
}

function toActionResult(
  result: CreateResult | TreeResult,
  level: TopicNode["level"],
  slug: string | undefined,
): ActionResult {
  if (!result.ok) {
    if (result.reason === "slug-taken") return { ok: false, message: slugTakenMessage(level, slug) };
    if (result.reason === "in-use") return { ok: false, message: messages["in-use"][level] };
    return { ok: false, message: messages["not-found"] };
  }
  if (!("unchanged" in result)) regeneratePublicPages();
  return { ok: true };
}

export const createTopicAction = editorAction(async (_editor, rawInput: unknown) => {
  const input = newTopicSchema.safeParse(rawInput);
  if (!input.success) return { ok: false, message: input.error.issues[0].message } satisfies ActionResult;
  return toActionResult(await createTopic(input.data), "topic", input.data.slug);
});

export const createSubtopicAction = editorAction(async (_editor, rawTopicId: unknown, rawInput: unknown) => {
  const topicId = z.uuid().safeParse(rawTopicId);
  if (!topicId.success) return invalidRequest;
  const input = newTopicSchema.safeParse(rawInput);
  if (!input.success) return { ok: false, message: input.error.issues[0].message } satisfies ActionResult;
  return toActionResult(await createSubtopic(topicId.data, input.data), "subtopic", input.data.slug);
});

export const editNodeAction = editorAction(async (_editor, rawNode: unknown, rawChanges: unknown) => {
  const node = topicNodeSchema.safeParse(rawNode);
  if (!node.success) return invalidRequest;
  const changes = topicChangesSchema.safeParse(rawChanges);
  if (!changes.success) return { ok: false, message: changes.error.issues[0].message } satisfies ActionResult;
  return toActionResult(await editNode(node.data, changes.data), node.data.level, changes.data.slug);
});

export const moveNodeAction = editorAction(async (_editor, rawNode: unknown, rawDirection: unknown) => {
  const node = topicNodeSchema.safeParse(rawNode);
  const direction = directionSchema.safeParse(rawDirection);
  if (!node.success || !direction.success) return invalidRequest;
  return toActionResult(await moveNode(node.data, direction.data), node.data.level, undefined);
});

export const removeNodeAction = editorAction(async (_editor, rawNode: unknown) => {
  const node = topicNodeSchema.safeParse(rawNode);
  if (!node.success) return invalidRequest;
  return toActionResult(await removeNode(node.data), node.data.level, undefined);
});

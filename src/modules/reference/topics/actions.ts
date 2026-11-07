"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { directionSchema } from "../form-fields";
import { createSubtopic, createTopic, editNode, moveNode, removeNode, type TopicNode } from "./queries";
import { newTopicSchema, topicChangesSchema, topicNodeSchema } from "./validation";

export const createTopicAction = editorWrite({
  args: [],
  input: newTopicSchema,
  run: createTopic,
  messages: { "slug-taken": (input) => slugTakenMessage("topic", input.slug) },
});

export const createSubtopicAction = editorWrite({
  args: [z.uuid()],
  input: newTopicSchema,
  run: createSubtopic,
  messages: { "slug-taken": (_topicId, input) => slugTakenMessage("subtopic", input.slug) },
});

export const editNodeAction = editorWrite({
  args: [topicNodeSchema],
  input: topicChangesSchema,
  run: editNode,
  messages: { "slug-taken": (node, changes) => slugTakenMessage(node.level, changes.slug) },
});

export const moveNodeAction = editorWrite({
  args: [topicNodeSchema, directionSchema],
  run: moveNode,
});

export const removeNodeAction = editorWrite({
  args: [topicNodeSchema],
  run: removeNode,
  messages: { "in-use": inUseMessage },
});

function slugTakenMessage(level: TopicNode["level"], slug: string | undefined) {
  return level === "topic"
    ? `L'identifiant « ${slug} » est déjà pris par une autre thématique.`
    : `L'identifiant « ${slug} » est déjà pris par une autre sous-thématique de cette thématique.`;
}

function inUseMessage(node: TopicNode) {
  return node.level === "topic"
    ? "Une de ses sous-thématiques est utilisée par du contenu : rattachez ce contenu à une autre sous-thématique avant de supprimer la thématique."
    : "Cette sous-thématique est utilisée par du contenu : rattachez ce contenu à une autre sous-thématique avant de la supprimer.";
}

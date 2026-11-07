"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { createCandidacy, editCandidacy, removeCandidacy, setCandidacyStatus } from "./candidacies";
import { createParty, editParty, removeParty } from "./parties";
import { abbreviationTakenMessage, partyNameTakenMessage } from "./party-messages";
import { createSubtopic, createTopic, editNode, moveNode, removeNode, type TopicNode } from "./topics";
import {
  candidacySchema,
  candidacyStatusSchema,
  directionSchema,
  newCandidacySchema,
  newPartySchema,
  newTopicSchema,
  partyChangesSchema,
  topicChangesSchema,
  topicNodeSchema,
} from "./validation";

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

export const createPartyAction = editorWrite({
  args: [],
  input: newPartySchema,
  run: createParty,
  messages: { "name-taken": partyNameTakenMessage, "abbreviation-taken": abbreviationTakenMessage },
});

export const editPartyAction = editorWrite({
  args: [z.uuid()],
  input: partyChangesSchema,
  run: editParty,
  messages: {
    "name-taken": (_id, changes) => partyNameTakenMessage(changes),
    "abbreviation-taken": (_id, changes) => abbreviationTakenMessage(changes),
  },
});

export const removePartyAction = editorWrite({
  args: [z.uuid()],
  run: removeParty,
  messages: { "in-use": "Ce parti porte une candidature : supprimez-la avant de supprimer le parti." },
});

export const createCandidacyAction = editorWrite({
  args: [z.uuid()],
  input: newCandidacySchema,
  run: createCandidacy,
  messages: { "party-has-candidacy": "Ce parti a déjà une candidature : rechargez la page." },
});

export const editCandidacyAction = editorWrite({
  args: [z.uuid()],
  input: candidacySchema,
  run: editCandidacy,
});

export const setCandidacyStatusAction = editorWrite({
  args: [z.uuid(), candidacyStatusSchema],
  run: setCandidacyStatus,
});

export const removeCandidacyAction = editorWrite({
  args: [z.uuid()],
  run: removeCandidacy,
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

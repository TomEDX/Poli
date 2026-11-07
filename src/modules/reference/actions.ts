"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { removeCandidacy, setCandidacyStatus } from "./candidacies";
import { groupAbbreviationTakenMessage, groupInUseMessage, groupNameTakenMessage } from "./parliamentary-group-messages";
import {
  createParliamentaryGroup,
  moveParliamentaryGroup,
  removeParliamentaryGroup,
  saveParliamentaryGroup,
} from "./parliamentary-groups";
import { createParty, removeParty, saveParty } from "./parties";
import { abbreviationTakenMessage, partyNameTakenMessage } from "./party-messages";
import { createSource, editSource, removeSource } from "./sources";
import { createSubtopic, createTopic, editNode, moveNode, removeNode, type TopicNode } from "./topics";
import {
  candidacyStatusSchema,
  directionSchema,
  newParliamentaryGroupSchema,
  newPartySchema,
  newSourceSchema,
  newTopicSchema,
  parliamentaryGroupChangesSchema,
  partyEditSchema,
  sourceChangesSchema,
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

export const savePartyAction = editorWrite({
  args: [z.uuid()],
  input: partyEditSchema,
  run: saveParty,
  messages: {
    "name-taken": (_id, edit) => partyNameTakenMessage(edit.party ?? {}),
    "abbreviation-taken": (_id, edit) => abbreviationTakenMessage(edit.party ?? {}),
    "party-has-candidacy": "Ce parti a déjà une candidature : rechargez la page.",
  },
});

export const removePartyAction = editorWrite({
  args: [z.uuid()],
  run: removeParty,
  messages: { "in-use": "Ce parti porte une candidature : supprimez-la avant de supprimer le parti." },
});

export const setCandidacyStatusAction = editorWrite({
  args: [z.uuid(), candidacyStatusSchema],
  run: setCandidacyStatus,
});

export const removeCandidacyAction = editorWrite({
  args: [z.uuid()],
  run: removeCandidacy,
});

export const createParliamentaryGroupAction = editorWrite({
  args: [],
  input: newParliamentaryGroupSchema,
  run: createParliamentaryGroup,
  messages: { "name-taken": groupNameTakenMessage, "abbreviation-taken": groupAbbreviationTakenMessage },
});

export const saveParliamentaryGroupAction = editorWrite({
  args: [z.uuid()],
  input: parliamentaryGroupChangesSchema,
  run: saveParliamentaryGroup,
  messages: {
    "name-taken": (_id, changes) => groupNameTakenMessage(changes),
    "abbreviation-taken": (_id, changes) => groupAbbreviationTakenMessage(changes),
  },
});

export const moveParliamentaryGroupAction = editorWrite({
  args: [z.uuid(), directionSchema],
  run: moveParliamentaryGroup,
});

export const removeParliamentaryGroupAction = editorWrite({
  args: [z.uuid()],
  run: removeParliamentaryGroup,
  messages: { "in-use": groupInUseMessage },
});

export const createSourceAction = editorWrite({
  args: [],
  input: newSourceSchema,
  run: createSource,
});

export const editSourceAction = editorWrite({
  args: [z.uuid()],
  input: sourceChangesSchema,
  run: editSource,
});

export const removeSourceAction = editorWrite({
  args: [z.uuid()],
  run: removeSource,
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

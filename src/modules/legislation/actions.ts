"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { amendmentNumberTakenMessage, authorGroupOutsideLegislatureMessage } from "./amendment-messages";
import { amendmentSchema } from "./amendment-validation";
import { createAmendment, removeAmendment, saveAmendment } from "./amendments";
import { noSubtopicMessage, numberTakenMessage } from "./text-messages";
import { createText, removeText, saveText } from "./texts";
import { newTextSchema, textChangesSchema } from "./validation";
import {
  amendmentVotedTwiceMessage,
  groupVotedTwiceMessage,
  missingGroupVoteMessage,
  voteGroupOutsideLegislatureMessage,
  voteNumberTakenMessage,
} from "./vote-messages";
import { voteSchema } from "./vote-validation";
import { createVote, removeVote, saveVote } from "./votes";

export const createTextAction = editorWrite({
  args: [],
  input: newTextSchema,
  run: createText,
  messages: {
    "number-taken": (input) => numberTakenMessage(input.number),
    "no-subtopic": noSubtopicMessage,
  },
});

export const saveTextAction = editorWrite({
  args: [z.uuid()],
  input: textChangesSchema,
  run: saveText,
  messages: {
    "number-taken": (_id, changes) => numberTakenMessage(changes.number),
    "no-subtopic": noSubtopicMessage,
  },
});

export const removeTextAction = editorWrite({
  args: [z.uuid()],
  run: removeText,
});

// The scrutin and every group vote are saved in one write.
export const createVoteAction = editorWrite({
  args: [z.uuid()],
  input: voteSchema,
  run: createVote,
  messages: {
    "number-taken": (_textId, vote) => voteNumberTakenMessage(vote.number),
    "group-voted-twice": groupVotedTwiceMessage,
    "missing-group-vote": missingGroupVoteMessage,
    "group-outside-legislature": voteGroupOutsideLegislatureMessage,
    "amendment-voted-twice": amendmentVotedTwiceMessage,
  },
});

export const saveVoteAction = editorWrite({
  args: [z.uuid()],
  input: voteSchema,
  run: saveVote,
  messages: {
    "number-taken": (_id, vote) => voteNumberTakenMessage(vote.number),
    "group-voted-twice": groupVotedTwiceMessage,
    "missing-group-vote": missingGroupVoteMessage,
    "group-outside-legislature": voteGroupOutsideLegislatureMessage,
    "amendment-voted-twice": amendmentVotedTwiceMessage,
  },
});

export const removeVoteAction = editorWrite({
  args: [z.uuid()],
  run: removeVote,
});

export const createAmendmentAction = editorWrite({
  args: [z.uuid()],
  input: amendmentSchema,
  run: createAmendment,
  messages: {
    "number-taken": (_textId, amendment) => amendmentNumberTakenMessage(amendment.number),
    "group-outside-legislature": authorGroupOutsideLegislatureMessage,
  },
});

export const saveAmendmentAction = editorWrite({
  args: [z.uuid()],
  input: amendmentSchema,
  run: saveAmendment,
  messages: {
    "number-taken": (_id, amendment) => amendmentNumberTakenMessage(amendment.number),
    "group-outside-legislature": authorGroupOutsideLegislatureMessage,
  },
});

export const removeAmendmentAction = editorWrite({
  args: [z.uuid()],
  run: removeAmendment,
});

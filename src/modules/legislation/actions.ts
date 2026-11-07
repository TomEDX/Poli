"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { noSubtopicMessage, numberTakenMessage } from "./text-messages";
import { createText, removeText, saveText } from "./texts";
import { newTextSchema, textChangesSchema } from "./validation";
import { groupVotedTwiceMessage, voteNumberTakenMessage } from "./vote-messages";
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
  },
});

export const saveVoteAction = editorWrite({
  args: [z.uuid()],
  input: voteSchema,
  run: saveVote,
  messages: {
    "number-taken": (_id, vote) => voteNumberTakenMessage(vote.number),
    "group-voted-twice": groupVotedTwiceMessage,
  },
});

export const removeVoteAction = editorWrite({
  args: [z.uuid()],
  run: removeVote,
});

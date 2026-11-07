"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { createVote, removeVote, saveVote } from "./queries";
import { voteSchema } from "./validation";
import {
  amendmentVotedTwiceMessage,
  groupVotedTwiceMessage,
  missingGroupVoteMessage,
  voteGroupOutsideLegislatureMessage,
  voteNumberTakenMessage,
} from "./vocabulary";

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

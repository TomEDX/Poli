"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";
import { directionSchema } from "@/modules/reference/form-fields";

import { candidacyPositionedTwiceMessage } from "../positions/vocabulary";
import { createQuestion, moveQuestion, removeQuestion, saveQuestion } from "./queries";
import { newQuestionSchema, questionChangesSchema } from "./validation";

// The question and its positions are saved in one write.
export const createQuestionAction = editorWrite({
  args: [],
  input: newQuestionSchema,
  run: createQuestion,
  messages: { "candidacy-positioned-twice": candidacyPositionedTwiceMessage },
});

export const saveQuestionAction = editorWrite({
  args: [z.uuid()],
  input: questionChangesSchema,
  run: saveQuestion,
  messages: { "candidacy-positioned-twice": candidacyPositionedTwiceMessage },
});

export const moveQuestionAction = editorWrite({
  args: [z.uuid(), directionSchema],
  run: moveQuestion,
});

export const removeQuestionAction = editorWrite({
  args: [z.uuid()],
  run: removeQuestion,
});

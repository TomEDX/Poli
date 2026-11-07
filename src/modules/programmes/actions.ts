"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";
import { directionSchema } from "@/modules/reference/validation";

import { createExtract, moveExtract, removeExtract, saveExtract } from "./queries";
import { extractChangesSchema, newExtractSchema } from "./validation";

export const createExtractAction = editorWrite({
  args: [z.uuid()],
  input: newExtractSchema,
  run: createExtract,
});

export const saveExtractAction = editorWrite({
  args: [z.uuid()],
  input: extractChangesSchema,
  run: saveExtract,
});

export const moveExtractAction = editorWrite({
  args: [z.uuid(), directionSchema],
  run: moveExtract,
});

export const removeExtractAction = editorWrite({
  args: [z.uuid()],
  run: removeExtract,
});

"use server";

import { editorWrite } from "@/modules/editors/editor-write";

import { publishMethod, saveMethodDraft, unpublishMethod } from "./queries";
import { methodDraftSchema, publishedMethodSchema } from "./validation";

export const saveMethodDraftAction = editorWrite({
  args: [],
  input: methodDraftSchema,
  run: saveMethodDraft,
});

export const publishMethodAction = editorWrite({
  args: [],
  input: publishedMethodSchema,
  run: publishMethod,
});

export const unpublishMethodAction = editorWrite({
  args: [],
  run: unpublishMethod,
});

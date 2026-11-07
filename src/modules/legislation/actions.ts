"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { noSubtopicMessage, numberTakenMessage } from "./text-messages";
import { createText, removeText, saveText } from "./texts";
import { newTextSchema, textChangesSchema } from "./validation";

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

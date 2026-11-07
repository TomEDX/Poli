"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { createText, removeText, saveText } from "./queries";
import { newTextSchema, textChangesSchema } from "./validation";
import { noSubtopicMessage, textNumberTakenMessage } from "./vocabulary";

export const createTextAction = editorWrite({
  args: [],
  input: newTextSchema,
  run: createText,
  messages: {
    "number-taken": (input) => textNumberTakenMessage(input.number),
    "no-subtopic": noSubtopicMessage,
  },
});

export const saveTextAction = editorWrite({
  args: [z.uuid()],
  input: textChangesSchema,
  run: saveText,
  messages: {
    "number-taken": (_id, changes) => textNumberTakenMessage(changes.number),
    "no-subtopic": noSubtopicMessage,
  },
});

export const removeTextAction = editorWrite({
  args: [z.uuid()],
  run: removeText,
});

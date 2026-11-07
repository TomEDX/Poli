"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { createAmendment, removeAmendment, saveAmendment } from "./queries";
import { amendmentSchema } from "./validation";
import { amendmentNumberTakenMessage, authorGroupOutsideLegislatureMessage } from "./vocabulary";

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

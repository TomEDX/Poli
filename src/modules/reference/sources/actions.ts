"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { createSource, editSource, removeSource } from "./queries";
import { newSourceSchema, sourceChangesSchema } from "./validation";

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
  messages: {
    "in-use": "Un contenu renvoie encore à cette source : retirez-la de ce contenu avant de la supprimer.",
  },
});

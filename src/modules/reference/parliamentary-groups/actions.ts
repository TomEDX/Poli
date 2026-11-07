"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { directionSchema } from "../form-fields";
import {
  createParliamentaryGroup,
  moveParliamentaryGroup,
  removeParliamentaryGroup,
  saveParliamentaryGroup,
} from "./queries";
import { newParliamentaryGroupSchema, parliamentaryGroupChangesSchema } from "./validation";
import { groupAbbreviationTakenMessage, groupInUseMessage, groupNameTakenMessage } from "./vocabulary";

export const createParliamentaryGroupAction = editorWrite({
  args: [],
  input: newParliamentaryGroupSchema,
  run: createParliamentaryGroup,
  messages: { "name-taken": groupNameTakenMessage, "abbreviation-taken": groupAbbreviationTakenMessage },
});

export const saveParliamentaryGroupAction = editorWrite({
  args: [z.uuid()],
  input: parliamentaryGroupChangesSchema,
  run: saveParliamentaryGroup,
  messages: {
    "name-taken": (_id, changes) => groupNameTakenMessage(changes),
    "abbreviation-taken": (_id, changes) => groupAbbreviationTakenMessage(changes),
  },
});

export const moveParliamentaryGroupAction = editorWrite({
  args: [z.uuid(), directionSchema],
  run: moveParliamentaryGroup,
});

export const removeParliamentaryGroupAction = editorWrite({
  args: [z.uuid()],
  run: removeParliamentaryGroup,
  messages: { "in-use": groupInUseMessage },
});

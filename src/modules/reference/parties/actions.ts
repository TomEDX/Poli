"use server";

import { z } from "zod";

import { editorWrite } from "@/modules/editors/editor-write";

import { createParty, removeCandidacy, removeParty, saveParty, setCandidacyStatus } from "./queries";
import { candidacyStatusSchema, newPartySchema, partyEditSchema } from "./validation";
import { abbreviationTakenMessage, logoTypeMessage, partyNameTakenMessage } from "./vocabulary";

export const createPartyAction = editorWrite({
  args: [],
  input: newPartySchema,
  run: createParty,
  messages: {
    "name-taken": partyNameTakenMessage,
    "abbreviation-taken": abbreviationTakenMessage,
    "unsupported-logo": logoTypeMessage,
  },
});

export const savePartyAction = editorWrite({
  args: [z.uuid()],
  input: partyEditSchema,
  run: saveParty,
  messages: {
    "name-taken": (_id, edit) => partyNameTakenMessage(edit.party ?? {}),
    "abbreviation-taken": (_id, edit) => abbreviationTakenMessage(edit.party ?? {}),
    "party-has-candidacy": "Ce parti a déjà une candidature : rechargez la page.",
    "unsupported-logo": logoTypeMessage,
  },
});

export const removePartyAction = editorWrite({
  args: [z.uuid()],
  run: removeParty,
  messages: { "in-use": "Ce parti porte une candidature : supprimez-la avant de supprimer le parti." },
});

export const setCandidacyStatusAction = editorWrite({
  args: [z.uuid(), candidacyStatusSchema],
  run: setCandidacyStatus,
});

export const removeCandidacyAction = editorWrite({
  args: [z.uuid()],
  run: removeCandidacy,
});

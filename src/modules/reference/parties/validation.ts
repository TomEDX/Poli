import { z } from "zod";

import { abbreviationField, NAME_MAX_LENGTH, nameField, slugify } from "../form-fields";
import { publicationStatuses } from "../publication-status";

export const candidacyStatusSchema = z.enum(publicationStatuses);

// A blank candidate name means no candidate is declared yet.
const candidateNameField = z
  .string()
  .trim()
  .max(NAME_MAX_LENGTH, `Le nom dépasse ${NAME_MAX_LENGTH} caractères.`)
  .refine((name) => name === "" || slugify(name) !== "", "Le nom doit contenir au moins une lettre.")
  .transform((name) => (name === "" ? null : name));

const newCandidacySchema = z.object({
  candidateName: candidateNameField,
  status: candidacyStatusSchema.default("draft"),
});

export const newPartySchema = z.object({
  name: nameField,
  abbreviation: abbreviationField,
  candidacy: newCandidacySchema.nullable().default(null),
});

// What the party sheet saves: only the fields that changed, written together or not at all.
export const partyEditSchema = z.object({
  party: z.object({ name: nameField.optional(), abbreviation: abbreviationField.optional() }).optional(),
  candidacy: z
    .object({ candidateName: candidateNameField.optional(), status: candidacyStatusSchema.optional() })
    .optional(),
  newCandidacy: newCandidacySchema.optional(),
});

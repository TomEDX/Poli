import { z } from "zod";

import { abbreviationField, nameField } from "../form-fields";

// A party picked twice is linked once.
const partyIdsField = z.array(z.uuid()).transform((ids) => [...new Set(ids)]);

export const newParliamentaryGroupSchema = z.object({
  name: nameField,
  abbreviation: abbreviationField,
  partyIds: partyIdsField.default([]),
});

// On an edit, only the fields sent change; partyIds replaces every link of the group.
export const parliamentaryGroupChangesSchema = z
  .object({ name: nameField.optional(), abbreviation: abbreviationField.optional(), partyIds: partyIdsField.optional() })
  .refine(
    (changes) => changes.name !== undefined || changes.abbreviation !== undefined || changes.partyIds !== undefined,
    "Saisissez un nom, un sigle ou des partis.",
  );

import { z } from "zod";

import { publicationStatuses } from "@/modules/reference/publication-status";
import { sourceIdsField } from "@/modules/reference/sources/validation";

export const QUOTE_MAX_LENGTH = 3000;

const subtopicIdField = z.uuid({ error: "Choisissez la sous-thématique." });

// Word for word: only the blanks around the pasted quote are dropped.
const quoteField = z
  .string()
  .trim()
  .min(1, "Collez la citation du programme.")
  .max(QUOTE_MAX_LENGTH, `La citation dépasse ${QUOTE_MAX_LENGTH} caractères.`);

const recordedOnField = z.iso.date({ error: "Saisissez la date de relevé." });

const statusField = z.enum(publicationStatuses);

export const newExtractSchema = z.object({
  subtopicId: subtopicIdField,
  quote: quoteField,
  recordedOn: recordedOnField,
  sourceIds: sourceIdsField.default([]),
  status: statusField.default("draft"),
});

// On an edit, only the fields that changed are sent; sourceIds replaces every source.
export const extractChangesSchema = z
  .object({
    subtopicId: subtopicIdField.optional(),
    quote: quoteField.optional(),
    recordedOn: recordedOnField.optional(),
    sourceIds: sourceIdsField.optional(),
    status: statusField.optional(),
  })
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), "Aucune modification à enregistrer.");

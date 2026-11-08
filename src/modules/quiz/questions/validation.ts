import { z } from "zod";

import { publicationStatuses } from "@/modules/reference/publication-status";

import { positionsField } from "../positions/validation";

export const STATEMENT_MAX_LENGTH = 300;

const subtopicIdField = z.uuid({ error: "Choisissez la sous-thématique." });

const statementField = z
  .string()
  .trim()
  .min(1, "Rédigez l’affirmation.")
  .max(STATEMENT_MAX_LENGTH, `L’affirmation dépasse ${STATEMENT_MAX_LENGTH} caractères.`);

const statusField = z.enum(publicationStatuses);

export const newQuestionSchema = z.object({
  subtopicId: subtopicIdField,
  statement: statementField,
  positions: positionsField.default([]),
  status: statusField.default("draft"),
});

// On an edit, only the fields that changed are sent; positions replaces every position.
export const questionChangesSchema = z
  .object({
    subtopicId: subtopicIdField.optional(),
    statement: statementField.optional(),
    positions: positionsField.optional(),
    status: statusField.optional(),
  })
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), "Aucune modification à enregistrer.");

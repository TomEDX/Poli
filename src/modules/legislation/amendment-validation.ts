import { z } from "zod";

import { publicationStatuses } from "@/modules/reference/publication-status";

import { amendmentFates, amendmentOpinions } from "./amendment-kinds";
import { numberField, optionalIdField, sourceIdsField, summaryField } from "./form-fields";

export const AUTHOR_LABEL_MAX_LENGTH = 200;

export const COSIGNATORIES_MAX_LENGTH = 1000;

// Blank when the amendment has no cosignatory.
const cosignatoriesField = z
  .string()
  .nullable()
  .transform((label) => label?.trim() || null)
  .pipe(
    z
      .string()
      .max(COSIGNATORIES_MAX_LENGTH, `Les cosignataires dépassent ${COSIGNATORIES_MAX_LENGTH} caractères.`)
      .nullable(),
  );

const opinionField = z.enum(amendmentOpinions, { error: "Choisissez un avis, ou « Aucun avis »." });

// An amendment as the form sends it, on a creation and on an edit alike.
// The author's group is blank when the author sits in no group, or it is not entered.
export const amendmentSchema = z.object({
  number: numberField({ missing: "Saisissez le numéro de l’amendement.", label: "Le numéro de l’amendement" }),
  authorLabel: z
    .string()
    .trim()
    .min(1, "Saisissez l’auteur de l’amendement.")
    .max(AUTHOR_LABEL_MAX_LENGTH, `L’auteur dépasse ${AUTHOR_LABEL_MAX_LENGTH} caractères.`),
  authorGroupId: optionalIdField.default(null),
  cosignatories: cosignatoriesField.default(null),
  summary: summaryField,
  fate: z.enum(amendmentFates, { error: "Choisissez le sort de l’amendement." }),
  governmentOpinion: opinionField.default("none"),
  committeeOpinion: opinionField.default("none"),
  status: z.enum(publicationStatuses).default("draft"),
  // Left out, the amendment keeps its sources, so a save that does not send them erases none.
  sourceIds: sourceIdsField.optional(),
});


import { z } from "zod";

import { publicationStatuses } from "@/modules/reference/publication-status";

import { amendmentFates, amendmentOpinions } from "./amendment-kinds";
import { SUMMARY_MAX_LENGTH } from "./validation";

export const AUTHOR_LABEL_MAX_LENGTH = 200;

export const COSIGNATORIES_MAX_LENGTH = 1000;

// The form sends what was typed; a value already parsed comes back as a number.
const numberField = z.coerce
  .string()
  .trim()
  .min(1, "Saisissez le numéro de l’amendement.")
  .regex(/^\d{1,9}$/, "Le numéro de l’amendement ne contient que des chiffres.")
  .transform(Number)
  .refine((number) => number > 0, "Le numéro de l’amendement commence à 1.");

// Blank when the author sits in no group, or it is not entered.
const authorGroupIdField = z
  .string()
  .nullable()
  .transform((id) => id?.trim() || null)
  .pipe(z.uuid().nullable());

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
export const amendmentSchema = z.object({
  number: numberField,
  authorLabel: z
    .string()
    .trim()
    .min(1, "Saisissez l’auteur de l’amendement.")
    .max(AUTHOR_LABEL_MAX_LENGTH, `L’auteur dépasse ${AUTHOR_LABEL_MAX_LENGTH} caractères.`),
  authorGroupId: authorGroupIdField.default(null),
  cosignatories: cosignatoriesField.default(null),
  summary: z
    .string()
    .trim()
    .min(1, "Saisissez le résumé éditorial.")
    .max(SUMMARY_MAX_LENGTH, `Le résumé éditorial dépasse ${SUMMARY_MAX_LENGTH} caractères.`),
  fate: z.enum(amendmentFates, { error: "Choisissez le sort de l’amendement." }),
  governmentOpinion: opinionField.default("none"),
  committeeOpinion: opinionField.default("none"),
  status: z.enum(publicationStatuses).default("draft"),
});


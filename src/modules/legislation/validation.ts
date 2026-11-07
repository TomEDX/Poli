import { z } from "zod";

import { publicationStatuses } from "@/modules/reference/publication-status";
import { webUrlField } from "@/modules/reference/validation";

import { textNatures } from "./text-natures";

export const OFFICIAL_TITLE_MAX_LENGTH = 500;

export const SUMMARY_MAX_LENGTH = 2000;

// The form sends what was typed; a value already parsed comes back as a number.
const numberField = z.coerce
  .string()
  .trim()
  .min(1, "Saisissez le numéro du texte.")
  .regex(/^\d{1,9}$/, "Le numéro ne contient que des chiffres.")
  .transform(Number)
  .refine((number) => number > 0, "Le numéro commence à 1.");

const natureField = z.enum(textNatures, { error: "Choisissez la nature du texte." });

const officialTitleField = z
  .string()
  .trim()
  .min(1, "Saisissez le titre officiel.")
  .max(OFFICIAL_TITLE_MAX_LENGTH, `Le titre officiel dépasse ${OFFICIAL_TITLE_MAX_LENGTH} caractères.`);

const filedOnField = z.iso.date({ error: "Saisissez la date de dépôt." });

// Optional: a blank link means there is no official page yet.
export const officialUrlField = z
  .string()
  .nullable()
  .transform((url) => url?.trim() || null)
  .pipe(webUrlField.nullable());

const summaryField = z
  .string()
  .trim()
  .min(1, "Saisissez le résumé éditorial.")
  .max(SUMMARY_MAX_LENGTH, `Le résumé éditorial dépasse ${SUMMARY_MAX_LENGTH} caractères.`);

// A subtopic picked twice is filed once.
const subtopicIdsField = z.array(z.uuid()).transform((ids) => [...new Set(ids)]);

const statusField = z.enum(publicationStatuses);

export const newTextSchema = z.object({
  nature: natureField,
  number: numberField,
  officialTitle: officialTitleField,
  filedOn: filedOnField,
  officialUrl: officialUrlField,
  summary: summaryField,
  subtopicIds: subtopicIdsField.default([]),
  status: statusField.default("draft"),
});

// On an edit, only the fields that changed are sent; subtopicIds replaces every subtopic.
export const textChangesSchema = z
  .object({
    nature: natureField.optional(),
    number: numberField.optional(),
    officialTitle: officialTitleField.optional(),
    filedOn: filedOnField.optional(),
    officialUrl: officialUrlField.optional(),
    summary: summaryField.optional(),
    subtopicIds: subtopicIdsField.optional(),
    status: statusField.optional(),
  })
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), "Aucune modification à enregistrer.");

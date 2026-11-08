import { z } from "zod";

import { publicationStatuses } from "@/modules/reference/publication-status";
import { sourceIdsField } from "@/modules/reference/sources/validation";

import { numberField, officialUrlField, summaryField } from "../form-fields";
import { textNatures } from "./vocabulary";

export const OFFICIAL_TITLE_MAX_LENGTH = 500;

const textNumberField = numberField({ missing: "Saisissez le numéro du texte.", label: "Le numéro" });

const natureField = z.enum(textNatures, { error: "Choisissez la nature du texte." });

const officialTitleField = z
  .string()
  .trim()
  // A single space, even a non-breaking one, is kept: French titles put one before a colon.
  .overwrite((title) => title.replace(/\s{2,}/g, " "))
  .min(1, "Saisissez le titre officiel.")
  .max(OFFICIAL_TITLE_MAX_LENGTH, `Le titre officiel dépasse ${OFFICIAL_TITLE_MAX_LENGTH} caractères.`);

const filedOnField = z.iso.date({ error: "Saisissez la date de dépôt." });

// A subtopic picked twice is filed once.
const subtopicIdsField = z.array(z.uuid()).transform((ids) => [...new Set(ids)]);

const statusField = z.enum(publicationStatuses);

export const newTextSchema = z.object({
  nature: natureField,
  number: textNumberField,
  officialTitle: officialTitleField,
  filedOn: filedOnField,
  officialUrl: officialUrlField,
  summary: summaryField,
  subtopicIds: subtopicIdsField.default([]),
  sourceIds: sourceIdsField.default([]),
  status: statusField.default("draft"),
});

// On an edit, only the fields that changed are sent; subtopicIds and sourceIds replace
// every subtopic and every source.
export const textChangesSchema = z
  .object({
    nature: natureField.optional(),
    number: textNumberField.optional(),
    officialTitle: officialTitleField.optional(),
    filedOn: filedOnField.optional(),
    officialUrl: officialUrlField.optional(),
    summary: summaryField.optional(),
    subtopicIds: subtopicIdsField.optional(),
    sourceIds: sourceIdsField.optional(),
    status: statusField.optional(),
  })
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), "Aucune modification à enregistrer.");

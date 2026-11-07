import { z } from "zod";

import { webUrlField } from "@/modules/reference/form-fields";

export const SUMMARY_MAX_LENGTH = 2000;

// Optional: a blank link means there is no official page yet.
export const officialUrlField = z
  .string()
  .nullable()
  .transform((url) => url?.trim() || null)
  .pipe(webUrlField.nullable());

// The editorial summary of a text or an amendment.
export const summaryField = z
  .string()
  .trim()
  .min(1, "Saisissez le résumé éditorial.")
  .max(SUMMARY_MAX_LENGTH, `Le résumé éditorial dépasse ${SUMMARY_MAX_LENGTH} caractères.`);

// A pick from a select whose blank option means none.
export const optionalIdField = z
  .string()
  .nullable()
  .transform((id) => id?.trim() || null)
  .pipe(z.uuid().nullable());

// The sources a content is linked to, none required; a source picked twice is linked once.
export const sourceIdsField = z.array(z.uuid()).transform((ids) => [...new Set(ids)]);

/**
 * An official number, from 1. The form sends what was typed; a value already parsed comes
 * back as a number. label starts the messages, for instance "Le numéro du scrutin".
 */
export function numberField({ missing, label }: { missing: string; label: string }) {
  return z.coerce
    .string()
    .trim()
    .min(1, missing)
    .regex(/^\d{1,9}$/, `${label} ne contient que des chiffres.`)
    .transform(Number)
    .refine((number) => number > 0, `${label} commence à 1.`);
}

import { z } from "zod";

import { directions } from "@/lib/direction";

// Fields and limits shared by the forms of several concepts of the reference module, and by
// the modules that link to it.
export const NAME_MAX_LENGTH = 80;

export const ABBREVIATION_MAX_LENGTH = 20;

export const URL_MAX_LENGTH = 2000;

export const nameField = z
  .string()
  .trim()
  .min(1, "Saisissez un nom.")
  .max(NAME_MAX_LENGTH, `Le nom dépasse ${NAME_MAX_LENGTH} caractères.`)
  .refine((name) => slugify(name) !== "", "Le nom doit contenir au moins une lettre ou un chiffre.");

export const abbreviationField = z
  .string()
  .trim()
  .min(1, "Saisissez un sigle.")
  .max(ABBREVIATION_MAX_LENGTH, `Le sigle dépasse ${ABBREVIATION_MAX_LENGTH} caractères.`);

// Only web links: public pages turn them into links, so no javascript: or other scheme.
export const webUrlField = z
  .string()
  .trim()
  .max(URL_MAX_LENGTH, `Le lien dépasse ${URL_MAX_LENGTH} caractères.`)
  .pipe(
    z.url({
      protocol: /^https?$/,
      hostname: z.regexes.domain,
      error: "Saisissez un lien complet, qui commence par http:// ou https://.",
    }),
  );

export const directionSchema = z.enum(directions);

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("œ", "oe")
    .replaceAll("æ", "ae")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

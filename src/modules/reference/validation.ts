import { z } from "zod";

import { publicationStatuses } from "./publication-status";

export const NAME_MAX_LENGTH = 80;

export const ABBREVIATION_MAX_LENGTH = 20;

const nameField = z
  .string()
  .trim()
  .min(1, "Saisissez un nom.")
  .max(NAME_MAX_LENGTH, `Le nom dépasse ${NAME_MAX_LENGTH} caractères.`)
  .refine((name) => slugify(name) !== "", "Le nom doit contenir au moins une lettre ou un chiffre.");

const slugField = z
  .string()
  .transform(slugify)
  .refine((slug) => slug !== "", "Saisissez un identifiant avec au moins une lettre ou un chiffre.");

const abbreviationField = z
  .string()
  .trim()
  .min(1, "Saisissez un sigle.")
  .max(ABBREVIATION_MAX_LENGTH, `Le sigle dépasse ${ABBREVIATION_MAX_LENGTH} caractères.`);

// A blank candidate name means no candidate is declared yet.
const candidateNameField = z
  .string()
  .trim()
  .max(NAME_MAX_LENGTH, `Le nom dépasse ${NAME_MAX_LENGTH} caractères.`)
  .refine((name) => name === "" || slugify(name) !== "", "Le nom doit contenir au moins une lettre.")
  .transform((name) => (name === "" ? null : name));

export const candidacyStatusSchema = z.enum(publicationStatuses);

export const topicNodeSchema = z.object({ level: z.enum(["topic", "subtopic"]), id: z.uuid() });

export const directionSchema = z.enum(["up", "down"]);

// On creation, an empty slug is built from the name.
export const newTopicSchema = z
  .object({ name: nameField, slug: z.string().trim() })
  .transform(({ name, slug }) => ({ name, slug: slugify(slug || name) }));

// On an edit, only the fields sent change, and a slug cannot be emptied.
export const topicChangesSchema = z
  .object({ name: nameField.optional(), slug: slugField.optional() })
  .refine((changes) => changes.name !== undefined || changes.slug !== undefined, "Saisissez un nom ou un identifiant.");

export const candidacySchema = z.object({ candidateName: candidateNameField });

export const newCandidacySchema = candidacySchema.extend({ status: candidacyStatusSchema.default("draft") });

export const newPartySchema = z.object({
  name: nameField,
  abbreviation: abbreviationField,
  candidacy: newCandidacySchema.nullable().default(null),
});

export const partyChangesSchema = z
  .object({ name: nameField.optional(), abbreviation: abbreviationField.optional() })
  .refine((changes) => changes.name !== undefined || changes.abbreviation !== undefined, "Saisissez un nom ou un sigle.");

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

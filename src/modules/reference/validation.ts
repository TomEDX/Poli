import { z } from "zod";

import { publicationStatuses } from "./publication-status";
import { sourceKinds } from "./source-kinds";

export const NAME_MAX_LENGTH = 80;

export const ABBREVIATION_MAX_LENGTH = 20;

export const SOURCE_TITLE_MAX_LENGTH = 300;

export const ORGANIZATION_MAX_LENGTH = 120;

export const URL_MAX_LENGTH = 2000;

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

const sourceTitleField = z
  .string()
  .trim()
  .min(1, "Saisissez un titre.")
  .max(SOURCE_TITLE_MAX_LENGTH, `Le titre dépasse ${SOURCE_TITLE_MAX_LENGTH} caractères.`);

const organizationField = z
  .string()
  .trim()
  .min(1, "Saisissez l'organisme.")
  .max(ORGANIZATION_MAX_LENGTH, `L'organisme dépasse ${ORGANIZATION_MAX_LENGTH} caractères.`);

// Only web links: the Sources page turns them into links, so no javascript: or other scheme.
const sourceUrlField = z
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

const consultedOnField = z.iso.date({ error: "Saisissez la date de consultation." });

const sourceKindField = z.enum(sourceKinds, { error: "Choisissez un type de source." });

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

const newCandidacySchema = z.object({
  candidateName: candidateNameField,
  status: candidacyStatusSchema.default("draft"),
});

export const newPartySchema = z.object({
  name: nameField,
  abbreviation: abbreviationField,
  candidacy: newCandidacySchema.nullable().default(null),
});

// What the party sheet saves: only the fields that changed, written together or not at all.
export const partyEditSchema = z.object({
  party: z.object({ name: nameField.optional(), abbreviation: abbreviationField.optional() }).optional(),
  candidacy: z
    .object({ candidateName: candidateNameField.optional(), status: candidacyStatusSchema.optional() })
    .optional(),
  newCandidacy: newCandidacySchema.optional(),
});

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

export const newSourceSchema = z.object({
  title: sourceTitleField,
  organization: organizationField,
  url: sourceUrlField,
  consultedOn: consultedOnField,
  kind: sourceKindField,
});

// On an edit, only the fields that changed are sent.
export const sourceChangesSchema = newSourceSchema
  .partial()
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), "Aucune modification à enregistrer.");

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

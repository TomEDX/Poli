import { z } from "zod";

import { nameField, slugify } from "../form-fields";

export const topicNodeSchema = z.object({ level: z.enum(["topic", "subtopic"]), id: z.uuid() });

const slugField = z
  .string()
  .transform(slugify)
  .refine((slug) => slug !== "", "Saisissez un identifiant avec au moins une lettre ou un chiffre.");

// On creation, an empty slug is built from the name.
export const newTopicSchema = z
  .object({ name: nameField, slug: z.string().trim() })
  .transform(({ name, slug }) => ({ name, slug: slugify(slug || name) }));

// On an edit, only the fields sent change, and a slug cannot be emptied.
export const topicChangesSchema = z
  .object({ name: nameField.optional(), slug: slugField.optional() })
  .refine((changes) => changes.name !== undefined || changes.slug !== undefined, "Saisissez un nom ou un identifiant.");

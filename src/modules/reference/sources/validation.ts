import { z } from "zod";

import { webUrlField } from "../form-fields";
import { sourceKinds } from "./vocabulary";

export const SOURCE_TITLE_MAX_LENGTH = 300;

export const ORGANIZATION_MAX_LENGTH = 120;

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

const consultedOnField = z.iso.date({ error: "Saisissez la date de consultation." });

const sourceKindField = z.enum(sourceKinds, { error: "Choisissez un type de source." });

export const newSourceSchema = z.object({
  title: sourceTitleField,
  organization: organizationField,
  url: webUrlField,
  consultedOn: consultedOnField,
  kind: sourceKindField,
});

// On an edit, only the fields that changed are sent.
export const sourceChangesSchema = newSourceSchema
  .partial()
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), "Aucune modification à enregistrer.");

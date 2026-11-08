import { z } from "zod";

import { abbreviationField, NAME_MAX_LENGTH, nameField, slugify } from "../form-fields";
import { publicationStatuses } from "../publication-status";
import { LOGO_MAX_BYTES, logoSizeMessage, logoTypeMessage, type LogoType, logoTypes } from "./vocabulary";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// A WebP file is a RIFF container: "RIFF", four bytes of length, then "WEBP".
const RIFF = [0x52, 0x49, 0x46, 0x46];

const WEBP = [0x57, 0x45, 0x42, 0x50];

// An SVG file may open with an XML declaration, comments and a doctype before its root element.
const SVG_START = /^\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:(?:<!--[\s\S]*?-->|<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>)\s*)*<svg[\s>]/i;

export const candidacyStatusSchema = z.enum(publicationStatuses);

// The declared type only spares the editor a useless upload; the server checks the content
// itself with logoContentType before storing anything.
export const logoFileSchema = z.file().max(LOGO_MAX_BYTES, logoSizeMessage).mime([...logoTypes], logoTypeMessage);

// A blank candidate name means no candidate is declared yet.
const candidateNameField = z
  .string()
  .trim()
  .max(NAME_MAX_LENGTH, `Le nom dépasse ${NAME_MAX_LENGTH} caractères.`)
  .refine((name) => name === "" || slugify(name) !== "", "Le nom doit contenir au moins une lettre.")
  .transform((name) => (name === "" ? null : name));

const newCandidacySchema = z.object({
  candidateName: candidateNameField,
  status: candidacyStatusSchema.default("draft"),
});

export const newPartySchema = z.object({
  name: nameField,
  abbreviation: abbreviationField,
  candidacy: newCandidacySchema.nullable().default(null),
  logo: logoFileSchema.optional(),
});

// What the party sheet saves: only the fields that changed, written together or not at all.
// A null logo removes it.
export const partyEditSchema = z.object({
  party: z.object({ name: nameField.optional(), abbreviation: abbreviationField.optional() }).optional(),
  candidacy: z
    .object({ candidateName: candidateNameField.optional(), status: candidacyStatusSchema.optional() })
    .optional(),
  newCandidacy: newCandidacySchema.optional(),
  logo: logoFileSchema.nullable().optional(),
});

/**
 * The logo type read from the file's first bytes, whatever its name or declared type, or null
 * when it is not an SVG, PNG or WebP image.
 */
export function logoContentType(bytes: Uint8Array): LogoType | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (startsWith(bytes, RIFF) && startsWith(bytes.subarray(8), WEBP)) return "image/webp";
  if (SVG_START.test(new TextDecoder().decode(bytes))) return "image/svg+xml";
  return null;
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]) {
  return prefix.every((byte, index) => bytes[index] === byte);
}

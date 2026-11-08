import type { PartyChanges } from "./queries";

// A party's and its candidacy's labels and messages, without Drizzle so that client-side
// code can use them.
export type LabelledCandidacy = { candidateName: string | null; party: { name: string; abbreviation: string } };

export const logoTypes = ["image/svg+xml", "image/png", "image/webp"] as const;

export type LogoType = (typeof logoTypes)[number];

// 1 Mo, the size limit of the logo bucket in supabase/config.toml.
export const LOGO_MAX_BYTES = 1024 * 1024;

// Shared by the form and the server, which also gives it when the content is not one of these images.
export const logoTypeMessage = "Choisissez une image SVG, PNG ou WebP.";

export const logoSizeMessage = "Le logo dépasse 1 Mo.";

// Shared by the public pages and the administration, so both always show the same name.
export function candidacyLabel({ candidateName, party }: LabelledCandidacy): string {
  return candidateName === null ? party.name : `${candidateName} (${party.abbreviation})`;
}

// Shared by the Server Actions and the new party form, which shows each one under its field.
export function partyNameTakenMessage(party: PartyChanges) {
  return `Le nom « ${party.name} » est déjà pris par un autre parti.`;
}

export function abbreviationTakenMessage(party: PartyChanges) {
  return `Le sigle « ${party.abbreviation} » est déjà pris par un autre parti.`;
}

import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { refusalOf, Refused } from "@/lib/write-refusals";
import type { WriteOutcome } from "@/modules/editors/editor-write";

import { logoUrl, removeLogo, uploadLogo } from "./logo-storage";
import { logoContentType } from "./validation";
import { candidacyLabel } from "./vocabulary";
import type { PublicationStatus } from "../publication-status";
import { candidacies, parties } from "../schema";

export type PartyInput = { name: string; abbreviation: string };

// A party can be created with its candidacy, so that the editor enters both at once.
export type NewParty = PartyInput & {
  candidacy?: { candidateName: string | null; status: PublicationStatus } | null;
  logo?: File;
};

export type PartyChanges = Partial<PartyInput>;

export type Party = PartyInput & {
  id: string;
  // The logo's public address, or null when the party has none.
  logo: string | null;
  candidacy: { id: string; candidateName: string | null; status: PublicationStatus; label: string } | null;
};

export type CreatePartyResult = { ok: true; id: string } | { ok: false; reason: Taken | "unsupported-logo" };

export type EditPartyResult = WriteOutcome<Taken | "not-found">;

export type RemovePartyResult = WriteOutcome<"in-use" | "not-found">;

// Everything the party sheet saves at once; each part is optional and holds only what changed.
// A null logo removes it.
export type PartyEdit = {
  party?: PartyChanges;
  candidacy?: { candidateName?: string | null; status?: PublicationStatus };
  newCandidacy?: { candidateName: string | null; status: PublicationStatus };
  logo?: File | null;
};

export type SavePartyResult = WriteOutcome<Taken | "not-found" | "party-has-candidacy" | "unsupported-logo">;

export type CandidacyInput = { candidateName: string | null };

// A new candidacy is a draft unless it is published right away.
export type NewCandidacy = CandidacyInput & { status?: PublicationStatus };

export type PublishedCandidacy = {
  id: string;
  label: string;
  candidateName: string | null;
  party: { id: string; name: string; abbreviation: string };
};

export type CreateCandidacyResult = { ok: true; id: string } | { ok: false; reason: "party-has-candidacy" | "not-found" };

export type CandidacyResult = WriteOutcome<"not-found">;

type Taken = "name-taken" | "abbreviation-taken";

type StoredLogo = { ok: true; path: string } | { ok: false };

const takenReasons: Record<string, Taken> = {
  parties_name_unique: "name-taken",
  parties_abbreviation_unique: "abbreviation-taken",
};

const saveTakenReasons: Record<string, Taken | "party-has-candidacy"> = {
  ...takenReasons,
  candidacies_party_id_unique: "party-has-candidacy",
};

// Drafts included: for the administration only; public pages read getPublishedCandidacies.
export async function getParties(): Promise<Party[]> {
  const rows = await db
    .select({
      id: parties.id,
      name: parties.name,
      abbreviation: parties.abbreviation,
      logoPath: parties.logoPath,
      candidacy: { id: candidacies.id, candidateName: candidacies.candidateName, status: candidacies.status },
    })
    .from(parties)
    .leftJoin(candidacies, eq(candidacies.partyId, parties.id))
    .orderBy(asc(parties.name));

  return rows.map(({ candidacy, logoPath, ...party }) => ({
    ...party,
    logo: logoPath && logoUrl(logoPath),
    candidacy: candidacy && { ...candidacy, label: candidacyLabel({ candidateName: candidacy.candidateName, party }) },
  }));
}

// The logo file is stored first, and removed again if the party is refused.
export async function createParty({ candidacy, logo, ...party }: NewParty): Promise<CreatePartyResult> {
  const stored = logo ? await storeLogo(logo) : null;
  if (stored && !stored.ok) return { ok: false, reason: "unsupported-logo" };
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(parties)
        .values({ ...party, logoPath: stored?.path ?? null })
        .returning({ id: parties.id });
      if (candidacy) await tx.insert(candidacies).values({ ...candidacy, partyId: created.id });
      return { ok: true as const, id: created.id };
    });
  } catch (error) {
    if (stored) await removeLogo(stored.path);
    return { ok: false, reason: refusalOf(error, { taken: takenReasons }) };
  }
}

// One transaction: if any change is refused, none is written. Only the given fields are
// written, so a save never brings back a value another editor changed. A new logo file is
// stored first and removed again if the save is refused; the file it replaces is removed
// once the save is written.
export async function saveParty(id: string, { logo, ...edit }: PartyEdit): Promise<SavePartyResult> {
  const stored = logo ? await storeLogo(logo) : null;
  if (stored && !stored.ok) return { ok: false, reason: "unsupported-logo" };
  const changes = { ...edit.party, ...(logo === undefined ? {} : { logoPath: stored?.path ?? null }) };
  let replacedLogo: string | null;
  try {
    replacedLogo = await db.transaction(async (tx) => {
      if (edit.candidacy && Object.keys(edit.candidacy).length > 0) {
        const [updated] = await tx
          .update(candidacies)
          .set(edit.candidacy)
          .where(eq(candidacies.partyId, id))
          .returning({ id: candidacies.id });
        if (!updated) throw new Refused("not-found");
      }
      if (edit.newCandidacy) await tx.insert(candidacies).values({ ...edit.newCandidacy, partyId: id });
      if (Object.keys(changes).length === 0) return null;
      const [current] = await tx
        .select({ logoPath: parties.logoPath })
        .from(parties)
        .where(eq(parties.id, id))
        .for("update");
      if (!current) throw new Refused("not-found");
      await tx.update(parties).set(changes).where(eq(parties.id, id));
      return logo === undefined ? null : current.logoPath;
    });
  } catch (error) {
    if (stored) await removeLogo(stored.path);
    // A foreign key breaks when the party was deleted meanwhile, so its new candidacy has nothing to point at.
    return { ok: false, reason: refusalOf(error, { taken: saveTakenReasons, foreignKey: "not-found" }) };
  }
  if (replacedLogo) await removeLogo(replacedLogo);
  return { ok: true };
}

// A party that still has a candidacy is kept, so no candidacy loses its party. Its logo file
// goes with it.
export async function removeParty(id: string): Promise<RemovePartyResult> {
  let deleted: { logoPath: string | null } | undefined;
  try {
    [deleted] = await db.delete(parties).where(eq(parties.id, id)).returning({ logoPath: parties.logoPath });
  } catch (error) {
    return { ok: false, reason: refusalOf(error, { foreignKey: "in-use" }) };
  }
  if (!deleted) return { ok: false, reason: "not-found" };
  if (deleted.logoPath) await removeLogo(deleted.logoPath);
  return { ok: true };
}

// Only the given fields are written, so an edit never brings back a value another editor changed.
export async function editParty(id: string, changes: PartyChanges): Promise<EditPartyResult> {
  if (changes.name === undefined && changes.abbreviation === undefined) {
    throw new Error("An edit needs a name or an abbreviation.");
  }
  try {
    const [edited] = await db.update(parties).set(changes).where(eq(parties.id, id)).returning({ id: parties.id });
    return edited ? { ok: true } : { ok: false, reason: "not-found" };
  } catch (error) {
    return { ok: false, reason: refusalOf(error, { taken: takenReasons }) };
  }
}

export async function getPublishedCandidacies(): Promise<PublishedCandidacy[]> {
  const rows = await db
    .select({
      id: candidacies.id,
      candidateName: candidacies.candidateName,
      party: { id: parties.id, name: parties.name, abbreviation: parties.abbreviation },
    })
    .from(candidacies)
    .innerJoin(parties, eq(parties.id, candidacies.partyId))
    .where(eq(candidacies.status, "published"))
    .orderBy(asc(parties.name));

  return rows.map((row) => ({ id: row.id, label: candidacyLabel(row), candidateName: row.candidateName, party: row.party }));
}

export async function createCandidacy(partyId: string, input: NewCandidacy): Promise<CreateCandidacyResult> {
  try {
    const [created] = await db.insert(candidacies).values({ ...input, partyId }).returning({ id: candidacies.id });
    return { ok: true, id: created.id };
  } catch (error) {
    // A foreign key breaks when the party was deleted meanwhile.
    return {
      ok: false,
      reason: refusalOf(error, { taken: { candidacies_party_id_unique: "party-has-candidacy" }, foreignKey: "not-found" }),
    };
  }
}

export async function editCandidacy(id: string, input: CandidacyInput): Promise<CandidacyResult> {
  return updateCandidacy(id, input);
}

export async function setCandidacyStatus(id: string, status: PublicationStatus): Promise<CandidacyResult> {
  return updateCandidacy(id, { status });
}

export async function removeCandidacy(id: string): Promise<CandidacyResult> {
  const [deleted] = await db.delete(candidacies).where(eq(candidacies.id, id)).returning({ id: candidacies.id });
  return deleted ? { ok: true } : { ok: false, reason: "not-found" };
}

async function updateCandidacy(
  id: string,
  changes: Partial<Pick<typeof candidacies.$inferInsert, "candidateName" | "status">>,
): Promise<CandidacyResult> {
  const [updated] = await db
    .update(candidacies)
    .set(changes)
    .where(eq(candidacies.id, id))
    .returning({ id: candidacies.id });
  return updated ? { ok: true } : { ok: false, reason: "not-found" };
}

// The type comes from the file's content, never from what the browser declared.
async function storeLogo(file: File): Promise<StoredLogo> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = logoContentType(bytes);
  if (!contentType) return { ok: false };
  return { ok: true, path: await uploadLogo(bytes, contentType) };
}

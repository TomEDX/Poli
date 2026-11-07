import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { refusalOf, Refused } from "@/lib/write-refusals";
import type { WriteOutcome } from "@/modules/editors/editor-write";

import { candidacyLabel } from "./vocabulary";
import type { PublicationStatus } from "../publication-status";
import { candidacies, parties } from "../schema";

export type PartyInput = { name: string; abbreviation: string };

// A party can be created with its candidacy, so that the editor enters both at once.
export type NewParty = PartyInput & {
  candidacy?: { candidateName: string | null; status: PublicationStatus } | null;
};

export type PartyChanges = Partial<PartyInput>;

export type Party = PartyInput & {
  id: string;
  candidacy: { id: string; candidateName: string | null; status: PublicationStatus; label: string } | null;
};

export type CreatePartyResult = { ok: true; id: string } | { ok: false; reason: Taken };

export type EditPartyResult = WriteOutcome<Taken | "not-found">;

export type RemovePartyResult = WriteOutcome<"in-use" | "not-found">;

// Everything the party sheet saves at once; each part is optional and holds only what changed.
export type PartyEdit = {
  party?: PartyChanges;
  candidacy?: { candidateName?: string | null; status?: PublicationStatus };
  newCandidacy?: { candidateName: string | null; status: PublicationStatus };
};

export type SavePartyResult = WriteOutcome<Taken | "not-found" | "party-has-candidacy">;

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
      candidacy: { id: candidacies.id, candidateName: candidacies.candidateName, status: candidacies.status },
    })
    .from(parties)
    .leftJoin(candidacies, eq(candidacies.partyId, parties.id))
    .orderBy(asc(parties.name));

  return rows.map(({ candidacy, ...party }) => ({
    ...party,
    candidacy: candidacy && { ...candidacy, label: candidacyLabel({ candidateName: candidacy.candidateName, party }) },
  }));
}

export async function createParty({ candidacy, ...party }: NewParty): Promise<CreatePartyResult> {
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx.insert(parties).values(party).returning({ id: parties.id });
      if (candidacy) await tx.insert(candidacies).values({ ...candidacy, partyId: created.id });
      return { ok: true as const, id: created.id };
    });
  } catch (error) {
    return { ok: false, reason: refusalOf(error, { taken: takenReasons }) };
  }
}

// One transaction: if any change is refused, none is written. Only the given fields are
// written, so a save never brings back a value another editor changed.
export async function saveParty(id: string, edit: PartyEdit): Promise<SavePartyResult> {
  try {
    await db.transaction(async (tx) => {
      if (edit.candidacy && Object.keys(edit.candidacy).length > 0) {
        const [updated] = await tx
          .update(candidacies)
          .set(edit.candidacy)
          .where(eq(candidacies.partyId, id))
          .returning({ id: candidacies.id });
        if (!updated) throw new Refused("not-found");
      }
      if (edit.newCandidacy) await tx.insert(candidacies).values({ ...edit.newCandidacy, partyId: id });
      if (edit.party && Object.keys(edit.party).length > 0) {
        const [updated] = await tx.update(parties).set(edit.party).where(eq(parties.id, id)).returning({ id: parties.id });
        if (!updated) throw new Refused("not-found");
      }
    });
    return { ok: true };
  } catch (error) {
    // A foreign key breaks when the party was deleted meanwhile, so its new candidacy has nothing to point at.
    return { ok: false, reason: refusalOf(error, { taken: saveTakenReasons, foreignKey: "not-found" }) };
  }
}

// A party that still has a candidacy is kept, so no candidacy loses its party.
export async function removeParty(id: string): Promise<RemovePartyResult> {
  try {
    const [deleted] = await db.delete(parties).where(eq(parties.id, id)).returning({ id: parties.id });
    return deleted ? { ok: true } : { ok: false, reason: "not-found" };
  } catch (error) {
    return { ok: false, reason: refusalOf(error, { foreignKey: "in-use" }) };
  }
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

import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WriteOutcome } from "@/modules/editors/editor-write";

import { candidacyLabel } from "./candidacy-label";
import { foreignKeyViolation, postgresError, uniqueViolation } from "./postgres-errors";
import type { PublicationStatus } from "./publication-status";
import { candidacies, parties } from "./schema";

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

type Taken = "name-taken" | "abbreviation-taken";

const takenReasons: Record<string, Taken> = {
  parties_name_unique: "name-taken",
  parties_abbreviation_unique: "abbreviation-taken",
};

// Thrown inside a transaction to roll it back with the reason the editor will read.
class Refused extends Error {
  constructor(readonly reason: "not-found") {
    super(reason);
  }
}

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
    return { ok: false, reason: takenReason(error) };
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
    if (error instanceof Refused) return { ok: false, reason: error.reason };
    const { code, constraint } = postgresError(error);
    if (code === uniqueViolation && constraint === "candidacies_party_id_unique") {
      return { ok: false, reason: "party-has-candidacy" };
    }
    // The party was deleted meanwhile, so its new candidacy has nothing to point at.
    if (code === foreignKeyViolation) return { ok: false, reason: "not-found" };
    return { ok: false, reason: takenReason(error) };
  }
}

// A party that still has a candidacy is kept, so no candidacy loses its party.
export async function removeParty(id: string): Promise<RemovePartyResult> {
  try {
    const [deleted] = await db.delete(parties).where(eq(parties.id, id)).returning({ id: parties.id });
    return deleted ? { ok: true } : { ok: false, reason: "not-found" };
  } catch (error) {
    if (postgresError(error).code === foreignKeyViolation) return { ok: false, reason: "in-use" };
    throw error;
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
    return { ok: false, reason: takenReason(error) };
  }
}

// Rethrows anything but a name or abbreviation already taken.
function takenReason(error: unknown): Taken {
  const { code, constraint } = postgresError(error);
  const reason = code === uniqueViolation && constraint ? takenReasons[constraint] : undefined;
  if (!reason) throw error;
  return reason;
}

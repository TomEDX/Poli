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

type Taken = "name-taken" | "abbreviation-taken";

const takenReasons: Record<string, Taken> = {
  parties_name_unique: "name-taken",
  parties_abbreviation_unique: "abbreviation-taken",
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

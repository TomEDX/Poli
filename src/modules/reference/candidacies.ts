import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WriteOutcome } from "@/modules/editors/editor-write";

import { candidacyLabel } from "./candidacy-label";
import { foreignKeyViolation, postgresError, uniqueViolation } from "./postgres-errors";
import type { PublicationStatus } from "./publication-status";
import { candidacies, parties } from "./schema";

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
    const { code } = postgresError(error);
    if (code === uniqueViolation) return { ok: false, reason: "party-has-candidacy" };
    // The party was deleted meanwhile.
    if (code === foreignKeyViolation) return { ok: false, reason: "not-found" };
    throw error;
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

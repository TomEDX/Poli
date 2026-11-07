import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WriteOutcome } from "@/modules/editors/editor-write";

import { foreignKeyViolation, postgresError, uniqueViolation } from "./postgres-errors";
import { legislatures, parliamentaryGroupParties, parliamentaryGroups, parties } from "./schema";
import type { Direction } from "./topics";

export type Legislature = { id: string; number: number; startedOn: string; endedOn: string | null };

export type ParliamentaryGroupInput = { name: string; abbreviation: string; partyIds: string[] };

// partyIds, when given, replaces every link of the group.
export type ParliamentaryGroupChanges = Partial<ParliamentaryGroupInput>;

export type ParliamentaryGroup = {
  id: string;
  name: string;
  abbreviation: string;
  parties: PartySummary[];
};

export type PartySummary = { id: string; name: string; abbreviation: string };

export type CreateParliamentaryGroupResult = { ok: true; id: string } | { ok: false; reason: Taken | "not-found" };

export type SaveParliamentaryGroupResult = WriteOutcome<Taken | "not-found">;

export type MoveParliamentaryGroupResult = WriteOutcome<"not-found">;

export type RemoveParliamentaryGroupResult = WriteOutcome<"in-use" | "not-found">;

type Taken = "name-taken" | "abbreviation-taken";

const takenReasons: Record<string, Taken> = {
  parliamentary_groups_legislature_id_name_unique: "name-taken",
  parliamentary_groups_legislature_id_abbreviation_unique: "abbreviation-taken",
};

// Thrown inside a transaction to roll it back with the reason the editor will read.
class Refused extends Error {
  constructor(readonly reason: "not-found") {
    super(reason);
  }
}

// The groups of the current legislature in the official order, for the public pages and
// the administration alike: groups are not drafted.
export async function getParliamentaryGroups(): Promise<ParliamentaryGroup[]> {
  const legislature = await getCurrentLegislature();
  const groups = await db
    .select({ id: parliamentaryGroups.id, name: parliamentaryGroups.name, abbreviation: parliamentaryGroups.abbreviation })
    .from(parliamentaryGroups)
    .where(eq(parliamentaryGroups.legislatureId, legislature.id))
    .orderBy(asc(parliamentaryGroups.position), asc(parliamentaryGroups.createdAt));
  const links = await db
    .select({
      groupId: parliamentaryGroupParties.groupId,
      party: { id: parties.id, name: parties.name, abbreviation: parties.abbreviation },
    })
    .from(parliamentaryGroupParties)
    .innerJoin(
      parliamentaryGroups,
      and(
        eq(parliamentaryGroups.id, parliamentaryGroupParties.groupId),
        eq(parliamentaryGroups.legislatureId, legislature.id),
      ),
    )
    .innerJoin(parties, eq(parties.id, parliamentaryGroupParties.partyId))
    .orderBy(asc(parties.name));

  return groups.map((group) => ({
    ...group,
    parties: links.filter((link) => link.groupId === group.id).map((link) => link.party),
  }));
}

// The latest one; there is a single legislature until another is added (ADR 0005).
export async function getCurrentLegislature(): Promise<Legislature> {
  const [legislature] = await db
    .select({
      id: legislatures.id,
      number: legislatures.number,
      startedOn: legislatures.startedOn,
      endedOn: legislatures.endedOn,
    })
    .from(legislatures)
    .orderBy(desc(legislatures.number))
    .limit(1);
  if (!legislature) throw new Error("No legislature: the migrations insert one.");
  return legislature;
}

export async function createParliamentaryGroup({
  partyIds,
  ...group
}: ParliamentaryGroupInput): Promise<CreateParliamentaryGroupResult> {
  const legislature = await getCurrentLegislature();
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(parliamentaryGroups)
        .values({
          ...group,
          legislatureId: legislature.id,
          position: sql`(select coalesce(max(${parliamentaryGroups.position}), 0) + 1 from ${parliamentaryGroups}
                         where ${parliamentaryGroups.legislatureId} = ${legislature.id})`,
        })
        .returning({ id: parliamentaryGroups.id });
      if (partyIds.length > 0) {
        await tx.insert(parliamentaryGroupParties).values(partyIds.map((partyId) => ({ groupId: created.id, partyId })));
      }
      return { ok: true as const, id: created.id };
    });
  } catch (error) {
    // A party picked by the editor was deleted meanwhile.
    if (postgresError(error).code === foreignKeyViolation) return { ok: false, reason: "not-found" };
    return { ok: false, reason: takenReason(error) };
  }
}

export async function moveParliamentaryGroup(id: string, direction: Direction): Promise<MoveParliamentaryGroupResult> {
  return db.transaction(async (tx) => {
    const [moved] = await tx
      .select({ legislatureId: parliamentaryGroups.legislatureId })
      .from(parliamentaryGroups)
      .where(eq(parliamentaryGroups.id, id));
    if (!moved) return { ok: false, reason: "not-found" };
    // Locked until the transaction ends, so two moves at once cannot mix up the order.
    const rows = await tx
      .select({ id: parliamentaryGroups.id })
      .from(parliamentaryGroups)
      .where(eq(parliamentaryGroups.legislatureId, moved.legislatureId))
      .orderBy(asc(parliamentaryGroups.position), asc(parliamentaryGroups.createdAt))
      .for("update");
    const siblings = rows.map((row) => row.id);
    const index = siblings.indexOf(id);
    if (index === -1) return { ok: false, reason: "not-found" };
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= siblings.length) return { ok: true, unchanged: true };

    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    // Every group is renumbered, which also repairs equal positions left by two creations at once.
    for (const [position, groupId] of siblings.entries()) {
      await tx.update(parliamentaryGroups).set({ position: position + 1 }).where(eq(parliamentaryGroups.id, groupId));
    }
    return { ok: true };
  });
}

// Refused while the group has voted in a scrutin, which would lose its vote.
export async function removeParliamentaryGroup(id: string): Promise<RemoveParliamentaryGroupResult> {
  try {
    const [deleted] = await db
      .delete(parliamentaryGroups)
      .where(eq(parliamentaryGroups.id, id))
      .returning({ id: parliamentaryGroups.id });
    return deleted ? { ok: true } : { ok: false, reason: "not-found" };
  } catch (error) {
    if (postgresError(error).code === foreignKeyViolation) return { ok: false, reason: "in-use" };
    throw error;
  }
}

// One transaction, and only the given fields are written, so a save never brings back a
// value another editor changed.
export async function saveParliamentaryGroup(
  id: string,
  { partyIds, ...group }: ParliamentaryGroupChanges,
): Promise<SaveParliamentaryGroupResult> {
  if (partyIds === undefined && group.name === undefined && group.abbreviation === undefined) {
    throw new Error("An edit needs a name, an abbreviation or parties.");
  }
  try {
    await db.transaction(async (tx) => {
      // Locks the group, so that it cannot be deleted while its links are replaced.
      const [found] =
        group.name !== undefined || group.abbreviation !== undefined
          ? await tx
              .update(parliamentaryGroups)
              .set(group)
              .where(eq(parliamentaryGroups.id, id))
              .returning({ id: parliamentaryGroups.id })
          : await tx
              .select({ id: parliamentaryGroups.id })
              .from(parliamentaryGroups)
              .where(eq(parliamentaryGroups.id, id))
              .for("update");
      if (!found) throw new Refused("not-found");
      if (partyIds === undefined) return;
      await tx.delete(parliamentaryGroupParties).where(eq(parliamentaryGroupParties.groupId, id));
      if (partyIds.length > 0) {
        await tx.insert(parliamentaryGroupParties).values(partyIds.map((partyId) => ({ groupId: id, partyId })));
      }
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Refused) return { ok: false, reason: error.reason };
    // A party picked by the editor was deleted meanwhile.
    if (postgresError(error).code === foreignKeyViolation) return { ok: false, reason: "not-found" };
    return { ok: false, reason: takenReason(error) };
  }
}

// Rethrows anything but a name or abbreviation already taken in the legislature.
function takenReason(error: unknown): Taken {
  const { code, constraint } = postgresError(error);
  const reason = code === uniqueViolation && constraint ? takenReasons[constraint] : undefined;
  if (!reason) throw error;
  return reason;
}

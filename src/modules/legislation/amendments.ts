import { and, asc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import type { WriteOutcome } from "@/modules/editors/editor-write";
import { getCurrentLegislature } from "@/modules/reference/parliamentary-groups";
import { foreignKeyViolation, postgresError, uniqueViolation } from "@/modules/reference/postgres-errors";
import type { PublicationStatus } from "@/modules/reference/publication-status";
import { parliamentaryGroups } from "@/modules/reference/schema";

import type { AmendmentFate, AmendmentOpinion } from "./amendment-kinds";
import { amendments, texts, votes } from "./schema";
import { getPublishedVotes, type PublishedVote } from "./votes";

export type AmendmentInput = {
  number: number;
  authorLabel: string;
  // Null when the author sits in no group of the current legislature, or it is not entered.
  authorGroupId: string | null;
  cosignatories: string | null;
  summary: string;
  fate: AmendmentFate;
  governmentOpinion: AmendmentOpinion;
  committeeOpinion: AmendmentOpinion;
  status: PublicationStatus;
};

export type PublishedAmendment = Omit<AmendmentInput, "authorGroupId" | "status"> & {
  id: string;
  authorGroup: { id: string; name: string; abbreviation: string } | null;
  // Null when no public scrutin was held on it, for instance a vote by show of hands.
  vote: PublishedVote | null;
};

// What the administration lists and edits, drafts included.
export type Amendment = AmendmentInput & { id: string; vote: { id: string; number: number } | null };

export type CreateAmendmentResult = { ok: true; id: string } | { ok: false; reason: AmendmentRefusal };

export type SaveAmendmentResult = WriteOutcome<AmendmentRefusal>;

export type RemoveAmendmentResult = WriteOutcome<"not-found">;

type AmendmentRefusal = "number-taken" | "group-outside-legislature" | "not-found";

const amendmentColumns = {
  id: amendments.id,
  number: amendments.number,
  authorLabel: amendments.authorLabel,
  cosignatories: amendments.cosignatories,
  summary: amendments.summary,
  fate: amendments.fate,
  governmentOpinion: amendments.governmentOpinion,
  committeeOpinion: amendments.committeeOpinion,
};

// The published amendments of a published text, by number; none for a draft text.
export async function getPublishedAmendments(textId: string): Promise<PublishedAmendment[]> {
  if (!z.uuid().safeParse(textId).success) return [];
  const rows = await db
    .select({
      ...amendmentColumns,
      group: {
        id: parliamentaryGroups.id,
        name: parliamentaryGroups.name,
        abbreviation: parliamentaryGroups.abbreviation,
      },
    })
    .from(amendments)
    .innerJoin(texts, eq(texts.id, amendments.textId))
    .leftJoin(parliamentaryGroups, eq(parliamentaryGroups.id, amendments.authorGroupId))
    .where(and(eq(amendments.textId, textId), eq(amendments.status, "published"), eq(texts.status, "published")))
    .orderBy(asc(amendments.number));
  if (rows.length === 0) return [];
  const scrutins = await getPublishedVotes(textId);
  return rows.map(({ group, ...row }) => ({
    ...row,
    authorGroup: group,
    vote: scrutins.find((scrutin) => scrutin.amendmentId === row.id) ?? null,
  }));
}

export async function getAmendments(textId: string): Promise<Amendment[]> {
  const [rows, scrutins] = await Promise.all([
    db
      .select({ ...amendmentColumns, authorGroupId: amendments.authorGroupId, status: amendments.status })
      .from(amendments)
      .where(eq(amendments.textId, textId))
      .orderBy(asc(amendments.number)),
    db
      .select({ id: votes.id, number: votes.number, amendmentId: votes.amendmentId })
      .from(votes)
      .where(and(eq(votes.textId, textId), isNotNull(votes.amendmentId))),
  ]);
  return rows.map((row) => {
    const scrutin = scrutins.find((candidate) => candidate.amendmentId === row.id);
    return { ...row, vote: scrutin ? { id: scrutin.id, number: scrutin.number } : null };
  });
}

export async function createAmendment(textId: string, amendment: AmendmentInput): Promise<CreateAmendmentResult> {
  if (await isOutsideLegislature(amendment.authorGroupId)) return { ok: false, reason: "group-outside-legislature" };
  try {
    const [created] = await db
      .insert(amendments)
      .values({ ...amendment, textId })
      .returning({ id: amendments.id });
    return { ok: true, id: created.id };
  } catch (error) {
    return { ok: false, reason: refusal(error) };
  }
}

export async function saveAmendment(id: string, amendment: AmendmentInput): Promise<SaveAmendmentResult> {
  if (await isOutsideLegislature(amendment.authorGroupId)) return { ok: false, reason: "group-outside-legislature" };
  try {
    const [found] = await db
      .update(amendments)
      .set(amendment)
      .where(eq(amendments.id, id))
      .returning({ id: amendments.id });
    return found ? { ok: true } : { ok: false, reason: "not-found" };
  } catch (error) {
    return { ok: false, reason: refusal(error) };
  }
}

export async function removeAmendment(id: string): Promise<RemoveAmendmentResult> {
  const [deleted] = await db.delete(amendments).where(eq(amendments.id, id)).returning({ id: amendments.id });
  return deleted ? { ok: true } : { ok: false, reason: "not-found" };
}

// A group that does not exist is left to the foreign key, which reports it as deleted meanwhile.
async function isOutsideLegislature(groupId: string | null): Promise<boolean> {
  if (!groupId) return false;
  const [legislature, [group]] = await Promise.all([
    getCurrentLegislature(),
    db
      .select({ legislatureId: parliamentaryGroups.legislatureId })
      .from(parliamentaryGroups)
      .where(eq(parliamentaryGroups.id, groupId)),
  ]);
  return group !== undefined && group.legislatureId !== legislature.id;
}

// Rethrows anything the editor cannot act on.
function refusal(error: unknown): AmendmentRefusal {
  const { code, constraint } = postgresError(error);
  if (code === uniqueViolation && constraint === "amendments_text_id_number_unique") return "number-taken";
  // The text or the author's group was deleted while the editor filled the form.
  if (code === foreignKeyViolation) return "not-found";
  throw error;
}


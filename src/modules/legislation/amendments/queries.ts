import { and, asc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { refusalOf, Refused } from "@/lib/write-refusals";
import type { WriteOutcome } from "@/modules/editors/editor-write";
import {
  getCurrentLegislature,
  groupSummaryColumns,
  type ParliamentaryGroupSummary,
} from "@/modules/reference/parliamentary-groups/queries";
import type { PublicationStatus } from "@/modules/reference/publication-status";
import { parliamentaryGroups } from "@/modules/reference/schema";
import type { SourceSummary } from "@/modules/reference/sources/queries";

import type { AmendmentFate, AmendmentOpinion } from "./vocabulary";
import { replaceSources, sourceIdsOf, sourcesOf } from "../content-sources";
import { amendments, texts, votes } from "../schema";
import { getPublishedVotes, type PublishedVote } from "../votes/queries";

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
  // When given, replaces every source of the amendment; none on a creation without it.
  sourceIds?: string[];
};

export type PublishedAmendment = Omit<AmendmentInput, "authorGroupId" | "status" | "sourceIds"> & {
  id: string;
  authorGroup: ParliamentaryGroupSummary | null;
  // Null when no public scrutin was held on it, for instance a vote by show of hands.
  vote: PublishedVote | null;
  sources: SourceSummary[];
};

// What the administration lists and edits, drafts included.
export type Amendment = Required<AmendmentInput> & { id: string; vote: { id: string; number: number } | null };

export type CreateAmendmentResult = { ok: true; id: string } | { ok: false; reason: AmendmentRefusal };

export type SaveAmendmentResult = WriteOutcome<AmendmentRefusal>;

export type RemoveAmendmentResult = WriteOutcome<"not-found">;

type AmendmentRefusal = "number-taken" | "group-outside-legislature" | "not-found";

const takenReasons: Record<string, AmendmentRefusal> = { amendments_text_id_number_unique: "number-taken" };

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
    .select({ ...amendmentColumns, group: groupSummaryColumns })
    .from(amendments)
    .innerJoin(texts, eq(texts.id, amendments.textId))
    .leftJoin(parliamentaryGroups, eq(parliamentaryGroups.id, amendments.authorGroupId))
    .where(and(eq(amendments.textId, textId), eq(amendments.status, "published"), eq(texts.status, "published")))
    .orderBy(asc(amendments.number));
  if (rows.length === 0) return [];
  const [publishedVotes, sourcesByAmendment] = await Promise.all([
    getPublishedVotes(textId),
    sourcesOf(
      "amendment",
      rows.map((row) => row.id),
    ),
  ]);
  const votesByAmendment = new Map(publishedVotes.map((vote) => [vote.amendmentId, vote]));
  return rows.map(({ group, ...row }) => ({
    ...row,
    authorGroup: group,
    vote: votesByAmendment.get(row.id) ?? null,
    sources: sourcesByAmendment.get(row.id) ?? [],
  }));
}

export async function getAmendments(textId: string): Promise<Amendment[]> {
  const [rows, linkedVotes] = await Promise.all([
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
  const votesByAmendment = new Map(linkedVotes.map(({ amendmentId, ...vote }) => [amendmentId, vote]));
  const sourceIdsByAmendment = await sourceIdsOf(
    "amendment",
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    ...row,
    vote: votesByAmendment.get(row.id) ?? null,
    sourceIds: sourceIdsByAmendment.get(row.id) ?? [],
  }));
}

// One transaction: the amendment and its sources are written together or not at all.
export async function createAmendment(
  textId: string,
  { sourceIds = [], ...amendment }: AmendmentInput,
): Promise<CreateAmendmentResult> {
  if (await isOutsideLegislature(amendment.authorGroupId)) return { ok: false, reason: "group-outside-legislature" };
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(amendments)
        .values({ ...amendment, textId })
        .returning({ id: amendments.id });
      await replaceSources(tx, "amendment", created.id, sourceIds);
      return { ok: true as const, id: created.id };
    });
  } catch (error) {
    return { ok: false, reason: refusalOf(error, { taken: takenReasons, foreignKey: "not-found" }) };
  }
}

// One transaction: the amendment and its sources are written together or not at all.
export async function saveAmendment(id: string, { sourceIds, ...amendment }: AmendmentInput): Promise<SaveAmendmentResult> {
  if (await isOutsideLegislature(amendment.authorGroupId)) return { ok: false, reason: "group-outside-legislature" };
  try {
    await db.transaction(async (tx) => {
      const [found] = await tx.update(amendments).set(amendment).where(eq(amendments.id, id)).returning({ id: amendments.id });
      if (!found) throw new Refused("not-found");
      if (sourceIds !== undefined) await replaceSources(tx, "amendment", id, sourceIds);
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: refusalOf(error, { taken: takenReasons, foreignKey: "not-found" }) };
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


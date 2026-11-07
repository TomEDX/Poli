import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import type { WriteOutcome } from "@/modules/editors/editor-write";
import { foreignKeyViolation, postgresError, uniqueViolation } from "@/modules/reference/postgres-errors";
import { parliamentaryGroups } from "@/modules/reference/schema";

import { groupVotes, texts, votes } from "./schema";
import type { GroupPosition, VoteResult, VoteSubject } from "./vote-kinds";

// How many members of the group voted each way.
export type GroupCounts = { for: number; against: number; abstention: number; nonVoting: number };

// counts is null when only the majority position is known.
export type GroupVoteInput = { groupId: string; position: GroupPosition; counts: GroupCounts | null };

export type VoteInput = {
  subject: VoteSubject;
  number: number;
  // ISO date (YYYY-MM-DD): only the day of the scrutin matters.
  heldOn: string;
  result: VoteResult;
  officialUrl: string | null;
  groupVotes: GroupVoteInput[];
};

export type PublishedGroupVote = {
  group: { id: string; name: string; abbreviation: string };
  position: GroupPosition;
  counts: GroupCounts | null;
};

export type PublishedVote = Omit<VoteInput, "groupVotes"> & { id: string; groupVotes: PublishedGroupVote[] };

// What the administration lists and edits, whether the text is published or not.
export type Vote = VoteInput & { id: string };

export type CreateVoteResult = { ok: true; id: string } | { ok: false; reason: VoteRefusal };

export type SaveVoteResult = WriteOutcome<VoteRefusal>;

export type RemoveVoteResult = WriteOutcome<"not-found">;

type VoteRefusal = "number-taken" | "group-voted-twice" | "not-found";

const takenReasons: Record<string, VoteRefusal> = {
  votes_text_id_number_unique: "number-taken",
  group_votes_vote_id_group_id_unique: "group-voted-twice",
};

// Thrown inside a transaction to roll it back with the reason the editor will read.
class Refused extends Error {
  constructor(readonly reason: VoteRefusal) {
    super(reason);
  }
}

const voteColumns = {
  id: votes.id,
  subject: votes.subject,
  number: votes.number,
  heldOn: votes.heldOn,
  result: votes.result,
  officialUrl: votes.officialUrl,
};

// The scrutins of a published text, the one on the whole text first; none for a draft.
export async function getPublishedVotes(textId: string): Promise<PublishedVote[]> {
  if (!z.uuid().safeParse(textId).success) return [];
  const rows = await db
    .select(voteColumns)
    .from(votes)
    .innerJoin(texts, eq(texts.id, votes.textId))
    .where(and(eq(votes.textId, textId), eq(texts.status, "published")))
    .orderBy(...voteOrder);
  const cast = await groupVotesOf(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, groupVotes: cast.get(row.id) ?? [] }));
}

export async function getVotes(textId: string): Promise<Vote[]> {
  const rows = await db
    .select(voteColumns)
    .from(votes)
    .where(eq(votes.textId, textId))
    .orderBy(...voteOrder);
  const cast = await groupVotesOf(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    groupVotes: (cast.get(row.id) ?? []).map(({ group, ...groupVote }) => ({ groupId: group.id, ...groupVote })),
  }));
}

// One transaction: the scrutin and every group vote are written together or not at all.
export async function createVote(textId: string, { groupVotes: cast, ...vote }: VoteInput): Promise<CreateVoteResult> {
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(votes)
        .values({ ...vote, textId })
        .returning({ id: votes.id });
      if (cast.length > 0) {
        await tx.insert(groupVotes).values(cast.map((groupVote) => groupVoteRow(created.id, groupVote)));
      }
      return { ok: true as const, id: created.id };
    });
  } catch (error) {
    return { ok: false, reason: refusal(error) };
  }
}

// One transaction: the scrutin is rewritten and its group votes replaced, all or nothing.
export async function saveVote(id: string, { groupVotes: cast, ...vote }: VoteInput): Promise<SaveVoteResult> {
  try {
    await db.transaction(async (tx) => {
      const [found] = await tx.update(votes).set(vote).where(eq(votes.id, id)).returning({ id: votes.id });
      if (!found) throw new Refused("not-found");
      await tx.delete(groupVotes).where(eq(groupVotes.voteId, id));
      if (cast.length > 0) await tx.insert(groupVotes).values(cast.map((groupVote) => groupVoteRow(id, groupVote)));
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: refusal(error) };
  }
}

export async function removeVote(id: string): Promise<RemoveVoteResult> {
  const [deleted] = await db.delete(votes).where(eq(votes.id, id)).returning({ id: votes.id });
  return deleted ? { ok: true } : { ok: false, reason: "not-found" };
}

const voteOrder = [sql`${votes.subject} = 'whole_text' desc`, asc(votes.heldOn), asc(votes.number)];

// The group votes of each scrutin, groups in the official order.
async function groupVotesOf(voteIds: string[]): Promise<Map<string, PublishedGroupVote[]>> {
  const cast = new Map<string, PublishedGroupVote[]>();
  if (voteIds.length === 0) return cast;
  const rows = await db
    .select({
      voteId: groupVotes.voteId,
      group: {
        id: parliamentaryGroups.id,
        name: parliamentaryGroups.name,
        abbreviation: parliamentaryGroups.abbreviation,
      },
      position: groupVotes.position,
      for: groupVotes.forCount,
      against: groupVotes.againstCount,
      abstention: groupVotes.abstentionCount,
      nonVoting: groupVotes.nonVotingCount,
    })
    .from(groupVotes)
    .innerJoin(parliamentaryGroups, eq(parliamentaryGroups.id, groupVotes.groupId))
    .where(inArray(groupVotes.voteId, voteIds))
    .orderBy(asc(parliamentaryGroups.position), asc(parliamentaryGroups.createdAt));
  for (const { voteId, group, position, ...counts } of rows) {
    const groupVote = { group, position, counts: countsOf(counts) };
    cast.set(voteId, [...(cast.get(voteId) ?? []), groupVote]);
  }
  return cast;
}

// The four counts are entered together or not at all.
function countsOf(counts: { [Key in keyof GroupCounts]: number | null }): GroupCounts | null {
  const { for: inFavour, against, abstention, nonVoting } = counts;
  if (inFavour === null || against === null || abstention === null || nonVoting === null) return null;
  return { for: inFavour, against, abstention, nonVoting };
}

function groupVoteRow(voteId: string, { groupId, position, counts }: GroupVoteInput) {
  return {
    voteId,
    groupId,
    position,
    forCount: counts?.for ?? null,
    againstCount: counts?.against ?? null,
    abstentionCount: counts?.abstention ?? null,
    nonVotingCount: counts?.nonVoting ?? null,
  };
}

// Rethrows anything the editor cannot act on.
function refusal(error: unknown): VoteRefusal {
  if (error instanceof Refused) return error.reason;
  const { code, constraint } = postgresError(error);
  const taken = code === uniqueViolation && constraint ? takenReasons[constraint] : undefined;
  if (taken) return taken;
  // The text or a group was deleted while the editor filled the form.
  if (code === foreignKeyViolation) return "not-found";
  throw error;
}


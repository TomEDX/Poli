import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { sources } from "@/modules/reference/schema";
import { sourceOrder, sourceSummaryColumns, type SourceSummary } from "@/modules/reference/sources/queries";

import { amendmentSources, textSources, voteSources } from "./schema";

// The contents of the module an editor can link to sources.
export type SourcedContent = "text" | "amendment" | "vote";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const links = {
  text: {
    table: textSources,
    contentId: textSources.textId,
    insert: (tx: Transaction, textId: string, sourceIds: string[]) =>
      tx.insert(textSources).values(sourceIds.map((sourceId) => ({ textId, sourceId }))),
  },
  amendment: {
    table: amendmentSources,
    contentId: amendmentSources.amendmentId,
    insert: (tx: Transaction, amendmentId: string, sourceIds: string[]) =>
      tx.insert(amendmentSources).values(sourceIds.map((sourceId) => ({ amendmentId, sourceId }))),
  },
  vote: {
    table: voteSources,
    contentId: voteSources.voteId,
    insert: (tx: Transaction, voteId: string, sourceIds: string[]) =>
      tx.insert(voteSources).values(sourceIds.map((sourceId) => ({ voteId, sourceId }))),
  },
};

// The sources of each content, in the order of the Sources page.
export async function sourcesOf(content: SourcedContent, contentIds: string[]): Promise<Map<string, SourceSummary[]>> {
  const byContent = new Map<string, SourceSummary[]>();
  if (contentIds.length === 0) return byContent;
  const link = links[content];
  const rows = await db
    .select({ contentId: link.contentId, source: sourceSummaryColumns })
    .from(link.table)
    .innerJoin(sources, eq(sources.id, link.table.sourceId))
    .where(inArray(link.contentId, contentIds))
    .orderBy(...sourceOrder, asc(sources.id));
  for (const { contentId, source } of rows) byContent.set(contentId, [...(byContent.get(contentId) ?? []), source]);
  return byContent;
}

// The ids of the sources of each content, as the administration form edits them.
export async function sourceIdsOf(content: SourcedContent, contentIds: string[]): Promise<Map<string, string[]>> {
  const byContent = await sourcesOf(content, contentIds);
  return new Map([...byContent].map(([contentId, linked]) => [contentId, linked.map((source) => source.id)]));
}

/**
 * Replaces every source of the content with those given, within the caller's transaction.
 * A source deleted meanwhile breaks the foreign key: the caller rolls back and reports it.
 */
export async function replaceSources(tx: Transaction, content: SourcedContent, contentId: string, sourceIds: string[]) {
  const { table, contentId: column, insert } = links[content];
  await tx.delete(table).where(eq(column, contentId));
  if (sourceIds.length > 0) await insert(tx, contentId, sourceIds);
}

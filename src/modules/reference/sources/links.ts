import { asc, eq, inArray } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";

import { sources } from "../schema";
import { sourceOrder, sourceSummaryColumns, type SourceSummary } from "./queries";

// The sources of one kind of content, read and written through the table that links them.
export type SourceLinks = {
  // The sources of each content, in the order of the Sources page.
  sourcesOf(contentIds: string[]): Promise<Map<string, SourceSummary[]>>;
  // The ids of the sources of each content, as the administration form edits them.
  sourceIdsOf(contentIds: string[]): Promise<Map<string, string[]>>;
  // Replaces every source of the content with those given, within the caller's transaction.
  // A source deleted meanwhile breaks the foreign key: the caller rolls back and reports it.
  replace(tx: Transaction, contentId: string, sourceIds: string[]): Promise<void>;
};

type LinkTable<ContentKey extends string> = PgTable & { sourceId: AnyPgColumn } & Record<ContentKey, AnyPgColumn>;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Each module keeps its own link table, whose foreign keys refuse to delete a source still in
 * use; contentKey names its column that points at the module's content.
 */
export function sourceLinks<ContentKey extends string>(
  table: LinkTable<ContentKey>,
  contentKey: ContentKey,
): SourceLinks {
  const contentColumn = table[contentKey];

  async function sourcesOf(contentIds: string[]): Promise<Map<string, SourceSummary[]>> {
    const byContent = new Map<string, SourceSummary[]>();
    if (contentIds.length === 0) return byContent;
    const rows = await db
      .select({ contentId: contentColumn, source: sourceSummaryColumns })
      .from(table as PgTable)
      .innerJoin(sources, eq(sources.id, table.sourceId))
      .where(inArray(contentColumn, contentIds))
      .orderBy(...sourceOrder, asc(sources.id));
    for (const { contentId, source } of rows as { contentId: string; source: SourceSummary }[]) {
      byContent.set(contentId, [...(byContent.get(contentId) ?? []), source]);
    }
    return byContent;
  }

  return {
    sourcesOf,
    async sourceIdsOf(contentIds) {
      const byContent = await sourcesOf(contentIds);
      return new Map([...byContent].map(([contentId, linked]) => [contentId, linked.map((source) => source.id)]));
    },
    async replace(tx, contentId, sourceIds) {
      await tx.delete(table).where(eq(contentColumn, contentId));
      if (sourceIds.length === 0) return;
      // The row's shape depends on contentKey, which TypeScript cannot follow through a generic table.
      await tx.insert(table).values(sourceIds.map((sourceId) => ({ [contentKey]: contentId, sourceId })) as never);
    },
  };
}

import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { refusalOf } from "@/lib/write-refusals";
import type { WriteOutcome } from "@/modules/editors/editor-write";

import type { SourceKind } from "../source-kinds";
import { sources } from "../schema";

export type SourceInput = {
  title: string;
  organization: string;
  url: string;
  // ISO date (YYYY-MM-DD), without a time: only the day of consultation matters.
  consultedOn: string;
  kind: SourceKind;
};

export type Source = SourceInput & { id: string };

// What other modules show of a source next to the content it backs.
export type SourceSummary = { id: string; title: string; organization: string; url: string };

export type SourceChanges = Partial<SourceInput>;

export type CreateSourceResult = { ok: true; id: string };

export type SourceResult = WriteOutcome<"not-found">;

export type RemoveSourceResult = WriteOutcome<"in-use" | "not-found">;

export const sourceSummaryColumns = {
  id: sources.id,
  title: sources.title,
  organization: sources.organization,
  url: sources.url,
};

// The order of the Sources page, so that sources read in the same order everywhere.
export const sourceOrder = [asc(sources.organization), asc(sources.title)];

export async function getSources(): Promise<Source[]> {
  return db
    .select({
      id: sources.id,
      title: sources.title,
      organization: sources.organization,
      url: sources.url,
      consultedOn: sources.consultedOn,
      kind: sources.kind,
    })
    .from(sources)
    .orderBy(...sourceOrder);
}

export async function createSource(input: SourceInput): Promise<CreateSourceResult> {
  const [created] = await db.insert(sources).values(input).returning({ id: sources.id });
  return { ok: true, id: created.id };
}

// Only the given fields are written, so an edit never brings back a value another editor changed.
export async function editSource(id: string, changes: SourceChanges): Promise<SourceResult> {
  const [edited] = await db.update(sources).set(changes).where(eq(sources.id, id)).returning({ id: sources.id });
  return edited ? { ok: true } : { ok: false, reason: "not-found" };
}

// Refused while the source backs a content, which would lose the trace of where it comes from.
export async function removeSource(id: string): Promise<RemoveSourceResult> {
  try {
    const [deleted] = await db.delete(sources).where(eq(sources.id, id)).returning({ id: sources.id });
    return deleted ? { ok: true } : { ok: false, reason: "not-found" };
  } catch (error) {
    return { ok: false, reason: refusalOf(error, { foreignKey: "in-use" }) };
  }
}

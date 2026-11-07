import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WriteOutcome } from "@/modules/editors/editor-write";

import type { SourceKind } from "./source-kinds";
import { sources } from "./schema";

export type SourceInput = {
  title: string;
  organization: string;
  url: string;
  // ISO date (YYYY-MM-DD), without a time: only the day of consultation matters.
  consultedOn: string;
  kind: SourceKind;
};

export type Source = SourceInput & { id: string };

export type SourceChanges = Partial<SourceInput>;

export type CreateSourceResult = { ok: true; id: string };

export type SourceResult = WriteOutcome<"not-found">;

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
    .orderBy(asc(sources.organization), asc(sources.title));
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

export async function removeSource(id: string): Promise<SourceResult> {
  const [deleted] = await db.delete(sources).where(eq(sources.id, id)).returning({ id: sources.id });
  return deleted ? { ok: true } : { ok: false, reason: "not-found" };
}

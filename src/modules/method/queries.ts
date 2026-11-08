import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WriteOutcome } from "@/modules/editors/editor-write";
import type { PublicationStatus } from "@/modules/reference/publication-status";

import { methodPages } from "./schema";
import type { MethodSections } from "./vocabulary";

export type PublishedMethod = MethodSections & { publishedAt: Date };

// none: never published, or taken offline; outdated: the draft differs from the public page.
export type MethodPublication = "none" | "up-to-date" | "outdated";

export type EditableMethod = { draft: MethodSections; publication: MethodPublication; publishedAt: Date | null };

export type MethodWriteResult = WriteOutcome<never>;

const emptySections: MethodSections = { candidacyCriteria: "", textCriteria: "", scoreFormula: "" };

const sectionKeys = Object.keys(emptySections) as (keyof MethodSections)[];

const sectionColumns = {
  candidacyCriteria: methodPages.candidacyCriteria,
  textCriteria: methodPages.textCriteria,
  scoreFormula: methodPages.scoreFormula,
};

// null until the editors publish the page.
export async function getPublishedMethod(): Promise<PublishedMethod | null> {
  const [published] = await db
    .select({ ...sectionColumns, publishedAt: methodPages.updatedAt })
    .from(methodPages)
    .where(eq(methodPages.status, "published"));
  return published ?? null;
}

// What the editors work on: the draft, or the public page when no draft was saved.
export async function getEditableMethod(): Promise<EditableMethod> {
  const rows = await db
    .select({ ...sectionColumns, status: methodPages.status, updatedAt: methodPages.updatedAt })
    .from(methodPages);
  const draft = rows.find((row) => row.status === "draft");
  const published = rows.find((row) => row.status === "published");
  const source = draft ?? published;
  const sections = source ? pickSections(source) : emptySections;
  if (!published) return { draft: sections, publication: "none", publishedAt: null };
  const outdated = sectionKeys.some((key) => sections[key] !== published[key]);
  return { draft: sections, publication: outdated ? "outdated" : "up-to-date", publishedAt: published.updatedAt };
}

// The public page stays as it is until the draft is published.
export async function saveMethodDraft(sections: MethodSections): Promise<MethodWriteResult> {
  await upsert(db, "draft", sections);
  return { ok: true };
}

// The draft and the public page are written together, so they read the same afterwards.
export async function publishMethod(sections: MethodSections): Promise<MethodWriteResult> {
  await db.transaction(async (tx) => {
    await upsert(tx, "draft", sections);
    await upsert(tx, "published", sections);
  });
  return { ok: true };
}

// The draft is kept, so the page can be published again as it was.
export async function unpublishMethod(): Promise<MethodWriteResult> {
  const [published] = await db.select({ ...sectionColumns }).from(methodPages).where(eq(methodPages.status, "published"));
  if (!published) return { ok: true, unchanged: true };
  await db.transaction(async (tx) => {
    // A page published before any draft was saved would otherwise lose its text.
    await tx.insert(methodPages).values({ status: "draft", ...published }).onConflictDoNothing();
    await tx.delete(methodPages).where(eq(methodPages.status, "published"));
  });
  return { ok: true };
}

async function upsert(
  client: Pick<typeof db, "insert">,
  status: PublicationStatus,
  sections: MethodSections,
): Promise<void> {
  await client
    .insert(methodPages)
    .values({ status, ...sections })
    .onConflictDoUpdate({ target: methodPages.status, set: { ...sections, updatedAt: new Date() } });
}

function pickSections(row: MethodSections): MethodSections {
  return { candidacyCriteria: row.candidacyCriteria, textCriteria: row.textCriteria, scoreFormula: row.scoreFormula };
}

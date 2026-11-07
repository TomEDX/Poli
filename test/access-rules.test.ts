import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { createAmendment } from "@/modules/legislation/amendments";
import { createText, saveText } from "@/modules/legislation/texts";
import { createVote } from "@/modules/legislation/votes";
import { createParliamentaryGroup } from "@/modules/reference/parliamentary-groups";
import { topics } from "@/modules/reference/schema";
import { createSource } from "@/modules/reference/sources";
import { createSubtopic, createTopic } from "@/modules/reference/topics";

// The roles Supabase gives to a client that is not signed in (anon) or signed
// in through Supabase Auth (authenticated). The app itself connects as postgres.
const clientRoles = ["anon", "authenticated"] as const;

async function publicTables() {
  const rows = await db.execute<{ name: string }>(
    sql`select tablename as name from pg_tables where schemaname = 'public' order by tablename`,
  );
  return rows.map((row) => row.name);
}

async function asRole(role: string, statement: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw(`set local role ${role}`));
    return tx.execute(sql.raw(statement));
  });
}

async function errorCode(promise: Promise<unknown>) {
  try {
    await promise;
    return "succeeded";
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return cause?.code ?? (error as { code?: string }).code;
  }
}

const insufficientPrivilege = "42501";

const amendment = {
  authorLabel: "Mme Claire Martin",
  authorGroupId: null,
  cosignatories: null,
  summary: "Résumé",
  fate: "rejected",
  governmentOpinion: "none",
  committeeOpinion: "none",
} as const;

// Text 1 is published and text 2 a draft, both filed under the same subtopic.
async function publishedAndDraftTextIds() {
  const topic = await createTopic({ name: "Santé", slug: "sante" });
  const subtopic = topic.ok && (await createSubtopic(topic.id, { name: "Prévention", slug: "prevention" }));
  if (!subtopic || !subtopic.ok) throw new Error("Could not create the subtopic");
  const text = {
    nature: "member_bill" as const,
    officialTitle: "Proposition de loi",
    filedOn: "2026-10-03",
    officialUrl: null,
    summary: "Résumé",
    subtopicIds: [subtopic.id],
  };
  const published = await createText({ ...text, number: 1, status: "published" });
  const draft = await createText({ ...text, number: 2 });
  if (!published.ok || !draft.ok) throw new Error("Could not create the texts");
  return { published: published.id, draft: draft.id };
}

async function testGroupId() {
  const group = await createParliamentaryGroup({ name: "Groupe de test", abbreviation: "GDT", partyIds: [] });
  if (!group.ok) throw new Error("Could not create the group");
  return group.id;
}

describe("database access rules", () => {
  it("protects every public table with row level security and no write policy", async () => {
    const unprotected = await db.execute<{ name: string }>(
      sql`select relname as name from pg_class
          where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
    );
    const writePolicies = await db.execute<{ name: string }>(
      sql`select tablename || '.' || policyname as name from pg_policies
          where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')`,
    );

    expect(unprotected.map((row) => row.name)).toEqual([]);
    expect(writePolicies.map((row) => row.name)).toEqual([]);
  });

  it("refuses inserts and truncates from clients on every public table", async () => {
    const tables = await publicTables();
    expect(tables).toContain("editors");

    for (const table of tables) {
      for (const role of clientRoles) {
        expect(
          await errorCode(asRole(role, `insert into public."${table}" default values`)),
          `insert into ${table} as ${role}`,
        ).toBe(insufficientPrivilege);
        expect(
          await errorCode(asRole(role, `truncate public."${table}"`)),
          `truncate ${table} as ${role}`,
        ).toBe(insufficientPrivilege);
      }
    }
  });

  it("leaves existing rows untouched by client updates and deletes", async () => {
    await db.insert(topics).values({ name: "Santé", slug: "sante", position: 1 });
    await db.execute(sql`insert into editors (email) values ('editeur@example.fr')`);

    for (const role of clientRoles) {
      for (const table of ["topics", "editors"]) {
        await errorCode(asRole(role, `update public."${table}" set created_at = now() - interval '1 day'`));
        await errorCode(asRole(role, `delete from public."${table}"`));
      }
    }

    const rows = await db.execute<{ topics: number; editors: number; changed: number }>(
      sql`select (select count(*) from topics)::int as topics,
                 (select count(*) from editors)::int as editors,
                 (select count(*) from topics where created_at < now() - interval '1 hour')::int as changed`,
    );
    expect(rows[0]).toEqual({ topics: 1, editors: 1, changed: 0 });
  });

  it("let clients read published texts and their subtopics, never a draft", async () => {
    await publishedAndDraftTextIds();

    for (const role of clientRoles) {
      expect(await asRole(role, "select number from texts"), role).toEqual([{ number: 1 }]);
      expect(
        await asRole(role, "select t.number from text_subtopics ts join texts t on t.id = ts.text_id"),
        role,
      ).toEqual([{ number: 1 }]);
    }
  });

  it("let clients read the scrutins of published texts and their group votes, never those of a draft", async () => {
    const groupId = await testGroupId();
    const { published, draft } = await publishedAndDraftTextIds();
    const vote = {
      subject: "whole_text" as const,
      heldOn: "2026-10-20",
      result: "adopted" as const,
      officialUrl: null,
      amendmentId: null,
      groupVotes: [{ groupId, position: "for" as const, counts: null }],
    };
    await createVote(published, { ...vote, number: 10 });
    await createVote(draft, { ...vote, number: 20 });

    for (const role of clientRoles) {
      expect(await asRole(role, "select number from votes"), role).toEqual([{ number: 10 }]);
      expect(
        await asRole(role, "select v.number from group_votes gv join votes v on v.id = gv.vote_id"),
        role,
      ).toEqual([{ number: 10 }]);
    }
  });

  it("let clients read the published amendments of published texts, never a draft amendment or text", async () => {
    const { published, draft } = await publishedAndDraftTextIds();
    await createAmendment(published, { ...amendment, number: 10, status: "published" });
    await createAmendment(published, { ...amendment, number: 11, status: "draft" });
    await createAmendment(draft, { ...amendment, number: 20, status: "published" });

    for (const role of clientRoles) {
      expect(await asRole(role, "select number from amendments"), role).toEqual([{ number: 10 }]);
    }
  });

  it("hide from clients the scrutin of a draft amendment and its group votes", async () => {
    const groupId = await testGroupId();
    const { published } = await publishedAndDraftTextIds();
    const shown = await createAmendment(published, { ...amendment, number: 10, status: "published" });
    const draft = await createAmendment(published, { ...amendment, number: 11, status: "draft" });
    if (!shown.ok || !draft.ok) throw new Error("Could not create the amendments");
    const vote = {
      subject: "amendment" as const,
      heldOn: "2026-10-20",
      result: "rejected" as const,
      officialUrl: null,
      groupVotes: [{ groupId, position: "against" as const, counts: null }],
    };
    await createVote(published, { ...vote, number: 100, amendmentId: shown.id });
    await createVote(published, { ...vote, number: 110, amendmentId: draft.id });

    for (const role of clientRoles) {
      expect(await asRole(role, "select number from votes"), role).toEqual([{ number: 100 }]);
      expect(
        await asRole(role, "select v.number from group_votes gv join votes v on v.id = gv.vote_id"),
        role,
      ).toEqual([{ number: 100 }]);
    }
  });

  it("let clients read the sources links of what they can read, never those of a draft", async () => {
    const groupId = await testGroupId();
    const { published, draft } = await publishedAndDraftTextIds();
    const { id: sourceId } = await createSource({
      title: "Source",
      organization: "Assemblée nationale",
      url: "https://assemblee.example.org",
      consultedOn: "2026-10-01",
      kind: "other",
    });
    await saveText(published, { sourceIds: [sourceId] });
    await saveText(draft, { sourceIds: [sourceId] });
    const shown = await createAmendment(published, { ...amendment, number: 10, status: "published", sourceIds: [sourceId] });
    const hidden = await createAmendment(published, { ...amendment, number: 11, status: "draft", sourceIds: [sourceId] });
    if (!shown.ok || !hidden.ok) throw new Error("Could not create the amendments");
    const vote = {
      subject: "amendment" as const,
      heldOn: "2026-10-20",
      result: "rejected" as const,
      officialUrl: null,
      groupVotes: [{ groupId, position: "against" as const, counts: null }],
      sourceIds: [sourceId],
    };
    const shownVote = await createVote(published, { ...vote, number: 100, amendmentId: shown.id });
    await createVote(published, { ...vote, number: 110, amendmentId: hidden.id });
    await createVote(draft, { ...vote, subject: "whole_text", number: 200, amendmentId: null });
    if (!shownVote.ok) throw new Error("Could not create the scrutin");

    for (const role of clientRoles) {
      expect(await asRole(role, "select text_id from text_sources"), role).toEqual([{ text_id: published }]);
      expect(await asRole(role, "select amendment_id from amendment_sources"), role).toEqual([
        { amendment_id: shown.id },
      ]);
      expect(await asRole(role, "select vote_id from vote_sources"), role).toEqual([{ vote_id: shownVote.id }]);
    }
  });
});

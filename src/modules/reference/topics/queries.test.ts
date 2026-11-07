import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createSubtopic, createTopic, editNode, getTopicTree, moveNode, removeNode } from "./queries";

const topic = (id: string) => ({ level: "topic" as const, id });
const subtopic = (id: string) => ({ level: "subtopic" as const, id });

async function topicNames() {
  return (await getTopicTree()).map((topic) => topic.name);
}

async function subtopicNames() {
  return (await getTopicTree()).map((topic) => topic.subtopics.map((subtopic) => subtopic.name));
}

async function topicId(name: string, slug: string) {
  const result = await createTopic({ name, slug });
  if (!result.ok) throw new Error(`Could not create ${name}: ${result.reason}`);
  return result.id;
}

async function subtopicId(topicId: string, name: string, slug: string) {
  const result = await createSubtopic(topicId, { name, slug });
  if (!result.ok) throw new Error(`Could not create ${name}: ${result.reason}`);
  return result.id;
}

describe("topic tree", () => {
  it("returns topics in the order they were created", async () => {
    await createTopic({ name: "Santé", slug: "sante" });
    await createTopic({ name: "Éducation", slug: "education" });

    expect(await topicNames()).toEqual(["Santé", "Éducation"]);
  });

  it("refuses a slug already used by another topic", async () => {
    await topicId("Santé", "sante");
    const education = await topicId("Éducation", "education");

    expect(await createTopic({ name: "Santé bis", slug: "sante" })).toEqual({ ok: false, reason: "slug-taken" });
    expect(await editNode(topic(education), { slug: "sante" })).toEqual({ ok: false, reason: "slug-taken" });
    expect(await getTopicTree()).toMatchObject([{ slug: "sante" }, { slug: "education" }]);
  });

  it("moves a topic up or down among its neighbours", async () => {
    const health = await topicId("Santé", "sante");
    await topicId("Éducation", "education");
    const work = await topicId("Travail", "travail");

    expect(await moveNode(topic(work), "up")).toEqual({ ok: true });
    expect(await topicNames()).toEqual(["Santé", "Travail", "Éducation"]);

    await moveNode(topic(health), "down");
    expect(await topicNames()).toEqual(["Travail", "Santé", "Éducation"]);
  });

  it("leaves the order unchanged when a topic is already at the edge", async () => {
    const health = await topicId("Santé", "sante");
    const education = await topicId("Éducation", "education");

    expect(await moveNode(topic(health), "up")).toEqual({ ok: true, unchanged: true });
    expect(await moveNode(topic(education), "down")).toEqual({ ok: true, unchanged: true });
    expect(await topicNames()).toEqual(["Santé", "Éducation"]);
  });
});

describe("editing", () => {
  it("changes only the field it is given, so it never restores another editor's older value", async () => {
    const health = await topicId("Santé", "sante");

    // A second editor changes the slug; the first one then edits the name only.
    await editNode(topic(health), { slug: "sante-publique" });
    expect(await editNode(topic(health), { name: "Santé publique" })).toEqual({ ok: true });

    expect(await getTopicTree()).toMatchObject([{ name: "Santé publique", slug: "sante-publique" }]);
  });

  it("refuses a subtopic slug taken within its topic only", async () => {
    const health = await topicId("Santé", "sante");
    const education = await topicId("Éducation", "education");
    await subtopicId(health, "Hôpital", "hopital");
    await subtopicId(education, "Université", "universite");
    const doctors = await subtopicId(health, "Médecins", "medecins");

    expect(await editNode(subtopic(doctors), { slug: "hopital" })).toEqual({ ok: false, reason: "slug-taken" });
    expect(await editNode(subtopic(doctors), { slug: "universite" })).toEqual({ ok: true });
    expect(await editNode(subtopic(doctors), { name: "Médecine de ville" })).toEqual({ ok: true });
    expect(await getTopicTree()).toMatchObject([
      { subtopics: [{ slug: "hopital" }, { name: "Médecine de ville", slug: "universite" }] },
      { subtopics: [{ slug: "universite" }] },
    ]);
  });
});

describe("subtopics", () => {
  it("are returned under their topic, in the order they were created", async () => {
    const health = await topicId("Santé", "sante");
    const education = await topicId("Éducation", "education");
    await createSubtopic(health, { name: "Hôpital", slug: "hopital" });
    await createSubtopic(education, { name: "Université", slug: "universite" });
    await createSubtopic(health, { name: "Médecine de ville", slug: "medecine-de-ville" });

    expect(await getTopicTree()).toMatchObject([
      { name: "Santé", subtopics: [{ name: "Hôpital" }, { name: "Médecine de ville" }] },
      { name: "Éducation", subtopics: [{ name: "Université" }] },
    ]);
  });

  it("share a slug across topics but not within one", async () => {
    const health = await topicId("Santé", "sante");
    const education = await topicId("Éducation", "education");
    await createSubtopic(health, { name: "Financement", slug: "financement" });

    expect(await createSubtopic(education, { name: "Financement", slug: "financement" })).toMatchObject({
      ok: true,
    });
    expect(await createSubtopic(health, { name: "Budget", slug: "financement" })).toEqual({
      ok: false,
      reason: "slug-taken",
    });
  });

  it("move only among the subtopics of their topic", async () => {
    const health = await topicId("Santé", "sante");
    const education = await topicId("Éducation", "education");
    await subtopicId(health, "Hôpital", "hopital");
    await subtopicId(education, "Université", "universite");
    const doctors = await subtopicId(health, "Médecine de ville", "medecine-de-ville");

    await moveNode(subtopic(doctors), "up");
    expect(await subtopicNames()).toEqual([["Médecine de ville", "Hôpital"], ["Université"]]);

    expect(await moveNode(subtopic(doctors), "up")).toEqual({ ok: true, unchanged: true });
    expect(await subtopicNames()).toEqual([["Médecine de ville", "Hôpital"], ["Université"]]);
  });
});

describe("an item deleted meanwhile", () => {
  it("cannot be edited, moved or deleted again", async () => {
    const health = await topicId("Santé", "sante");
    const hospital = await subtopicId(health, "Hôpital", "hopital");
    await removeNode(topic(health));

    for (const node of [topic(health), subtopic(hospital)]) {
      expect(await editNode(node, { name: "Autre" })).toEqual({ ok: false, reason: "not-found" });
      expect(await moveNode(node, "up")).toEqual({ ok: false, reason: "not-found" });
      expect(await removeNode(node)).toEqual({ ok: false, reason: "not-found" });
    }
  });

  it("cannot receive a new subtopic", async () => {
    const health = await topicId("Santé", "sante");
    await removeNode(topic(health));

    expect(await createSubtopic(health, { name: "Hôpital", slug: "hopital" })).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("deletion", () => {
  it("removes a subtopic, or a topic with all its subtopics", async () => {
    const health = await topicId("Santé", "sante");
    const education = await topicId("Éducation", "education");
    const hospital = await subtopicId(health, "Hôpital", "hopital");
    await subtopicId(health, "Médecins", "medecins");
    await subtopicId(education, "Université", "universite");

    expect(await removeNode(subtopic(hospital))).toEqual({ ok: true });
    expect(await subtopicNames()).toEqual([["Médecins"], ["Université"]]);

    expect(await removeNode(topic(health))).toEqual({ ok: true });
    expect(await getTopicTree()).toMatchObject([{ name: "Éducation", subtopics: [{ name: "Université" }] }]);
  });

  describe("of a subtopic used by content", () => {
    it("stays guarded: every table pointing at subtopics restricts their deletion", async () => {
      const references = await db.execute<{ name: string; onDelete: string }>(
        sql`select conrelid::regclass::text as name, confdeltype::text as "onDelete" from pg_constraint
            where contype = 'f' and confrelid = 'public.subtopics'::regclass`,
      );

      expect(references.filter((reference) => reference.onDelete !== "r")).toEqual([]);
    });

    // Stands for any content table: they all reference subtopics with onDelete "restrict".
    afterEach(async () => {
      await db.execute(sql`drop table if exists test_contents`);
    });

    it("is refused, for the subtopic and for its topic", async () => {
      await db.execute(sql`create table test_contents (
        subtopic_id uuid not null references subtopics (id) on delete restrict
      )`);
      const health = await topicId("Santé", "sante");
      const hospital = await subtopicId(health, "Hôpital", "hopital");
      await db.execute(sql`insert into test_contents values (${hospital})`);

      expect(await removeNode(subtopic(hospital))).toEqual({ ok: false, reason: "in-use" });
      expect(await removeNode(topic(health))).toEqual({ ok: false, reason: "in-use" });
      expect(await subtopicNames()).toEqual([["Hôpital"]]);
    });
  });
});

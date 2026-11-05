import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import {
  createSubtopic,
  createTopic,
  deleteSubtopic,
  deleteTopic,
  getTopicTree,
  moveSubtopic,
  moveTopic,
  renameSubtopic,
  renameTopic,
} from "./topics";

async function topicNames() {
  return (await getTopicTree()).map((topic) => topic.name);
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

async function subtopicNames() {
  return (await getTopicTree()).map((topic) => topic.subtopics.map((subtopic) => subtopic.name));
}

describe("topic tree", () => {
  it("returns topics in the order they were created", async () => {
    await createTopic({ name: "Santé", slug: "sante" });
    await createTopic({ name: "Éducation", slug: "education" });

    expect(await topicNames()).toEqual(["Santé", "Éducation"]);
  });

  it("renames a topic and its slug", async () => {
    const health = await topicId("Santé", "sante");

    expect(await renameTopic(health, { name: "Santé publique", slug: "sante-publique" })).toEqual({
      ok: true,
      id: health,
    });
    expect(await getTopicTree()).toMatchObject([{ name: "Santé publique", slug: "sante-publique" }]);
  });

  it("refuses a slug already used by another topic", async () => {
    await topicId("Santé", "sante");
    const education = await topicId("Éducation", "education");

    expect(await createTopic({ name: "Santé bis", slug: "sante" })).toEqual({
      ok: false,
      reason: "slug-taken",
    });
    expect(await renameTopic(education, { name: "Éducation", slug: "sante" })).toEqual({
      ok: false,
      reason: "slug-taken",
    });
    expect(await topicNames()).toEqual(["Santé", "Éducation"]);
  });

  it("moves a topic up or down among its neighbours", async () => {
    const health = await topicId("Santé", "sante");
    await topicId("Éducation", "education");
    const work = await topicId("Travail", "travail");

    await moveTopic(work, "up");
    expect(await topicNames()).toEqual(["Santé", "Travail", "Éducation"]);

    await moveTopic(health, "down");
    expect(await topicNames()).toEqual(["Travail", "Santé", "Éducation"]);
  });

  it("leaves the order unchanged when a topic is already at the edge", async () => {
    const health = await topicId("Santé", "sante");
    const education = await topicId("Éducation", "education");

    await moveTopic(health, "up");
    await moveTopic(education, "down");

    expect(await topicNames()).toEqual(["Santé", "Éducation"]);
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

    await moveSubtopic(doctors, "up");
    expect(await subtopicNames()).toEqual([["Médecine de ville", "Hôpital"], ["Université"]]);

    await moveSubtopic(doctors, "up");
    expect(await subtopicNames()).toEqual([["Médecine de ville", "Hôpital"], ["Université"]]);
  });

  it("are renamed unless the slug is taken within the topic", async () => {
    const health = await topicId("Santé", "sante");
    await subtopicId(health, "Hôpital", "hopital");
    const doctors = await subtopicId(health, "Médecins", "medecins");

    expect(await renameSubtopic(doctors, { name: "Hôpital public", slug: "hopital" })).toEqual({
      ok: false,
      reason: "slug-taken",
    });
    expect(await renameSubtopic(doctors, { name: "Médecine de ville", slug: "medecine-de-ville" })).toEqual({
      ok: true,
      id: doctors,
    });
    expect(await subtopicNames()).toEqual([["Hôpital", "Médecine de ville"]]);
  });
});

describe("deletion", () => {
  it("removes a subtopic, or a topic with all its subtopics", async () => {
    const health = await topicId("Santé", "sante");
    const education = await topicId("Éducation", "education");
    const hospital = await subtopicId(health, "Hôpital", "hopital");
    await subtopicId(health, "Médecins", "medecins");
    await subtopicId(education, "Université", "universite");

    expect(await deleteSubtopic(hospital)).toEqual({ ok: true });
    expect(await subtopicNames()).toEqual([["Médecins"], ["Université"]]);

    expect(await deleteTopic(health)).toEqual({ ok: true });
    expect(await getTopicTree()).toMatchObject([{ name: "Éducation", subtopics: [{ name: "Université" }] }]);
  });

  describe("of a subtopic used by content", () => {
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

      expect(await deleteSubtopic(hospital)).toEqual({ ok: false, reason: "in-use" });
      expect(await deleteTopic(health)).toEqual({ ok: false, reason: "in-use" });
      expect(await subtopicNames()).toEqual([["Hôpital"]]);
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { editors } from "@/modules/editors/schema";

import { createSubtopicAction, createTopicAction, editNodeAction } from "./actions";
import { getTopicTree } from "./topics";

vi.mock("@/modules/editors/session", () => ({ getSignedInEmail: vi.fn(async () => "editrice@example.fr") }));

describe("topic tree actions", () => {
  beforeEach(async () => {
    await db.insert(editors).values({ email: "editrice@example.fr" });
  });

  it("name the slug and the level when a slug is already taken", async () => {
    await createTopicAction({ name: "Santé", slug: "" });
    const [health] = await getTopicTree();
    await createSubtopicAction(health.id, { name: "Hôpital", slug: "" });
    await createSubtopicAction(health.id, { name: "Médecins", slug: "" });
    const [, doctors] = (await getTopicTree())[0].subtopics;

    expect(await createTopicAction({ name: "Santé", slug: "" })).toEqual({
      ok: false,
      message: "L'identifiant « sante » est déjà pris par une autre thématique.",
    });
    expect(await editNodeAction({ level: "subtopic", id: doctors.id }, { slug: "Hôpital" })).toEqual({
      ok: false,
      message: "L'identifiant « hopital » est déjà pris par une autre sous-thématique de cette thématique.",
    });
  });
});

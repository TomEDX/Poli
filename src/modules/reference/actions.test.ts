import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { editors } from "@/modules/editors/schema";

import {
  createCandidacyAction,
  createPartyAction,
  createSubtopicAction,
  createTopicAction,
  editCandidacyAction,
  editNodeAction,
  editPartyAction,
  removePartyAction,
} from "./actions";
import { getParties } from "./parties";
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

describe("party and candidacy actions", () => {
  beforeEach(async () => {
    await db.insert(editors).values({ email: "editrice@example.fr" });
  });

  it("name the abbreviation or the name already taken by another party", async () => {
    await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH" });
    await createPartyAction({ name: "Union des territoires", abbreviation: "UDT" });
    const [, union] = await getParties();

    expect(await createPartyAction({ name: " Parti de l'Horizon ", abbreviation: "PH" })).toEqual({
      ok: false,
      message: "Le nom « Parti de l'Horizon » est déjà pris par un autre parti.",
    });
    expect(await editPartyAction(union.id, { abbreviation: " PDH " })).toEqual({
      ok: false,
      message: "Le sigle « PDH » est déjà pris par un autre parti.",
    });
  });

  it("treat a blank candidate name as no candidate declared yet", async () => {
    await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH" });
    const [horizon] = await getParties();

    expect(await createCandidacyAction(horizon.id, { candidateName: "  " })).toEqual({ ok: true });
    const [{ candidacy }] = await getParties();
    expect(candidacy).toMatchObject({ candidateName: null, label: "Parti de l'Horizon" });

    await editCandidacyAction(candidacy!.id, { candidateName: " Camille Martin " });
    expect((await getParties())[0].candidacy).toMatchObject({ label: "Camille Martin (PDH)" });
  });

  it("create a party with its candidacy, a blank candidate meaning none declared yet", async () => {
    expect(
      await createPartyAction({
        name: "Parti de l'Horizon",
        abbreviation: "PDH",
        candidacy: { candidateName: "  ", status: "published" },
      }),
    ).toEqual({ ok: true });

    expect((await getParties())[0].candidacy).toMatchObject({
      candidateName: null,
      status: "published",
      label: "Parti de l'Horizon",
    });
  });

  it("explain why a party with a candidacy cannot be deleted", async () => {
    await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH" });
    const [horizon] = await getParties();
    await createCandidacyAction(horizon.id, { candidateName: "" });

    expect(await removePartyAction(horizon.id)).toEqual({
      ok: false,
      message: "Ce parti porte une candidature : supprimez-la avant de supprimer le parti.",
    });
  });
});

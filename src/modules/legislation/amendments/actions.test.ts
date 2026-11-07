import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { editors } from "@/modules/editors/schema";
import { removeParliamentaryGroupAction } from "@/modules/reference/parliamentary-groups/actions";
import { createParliamentaryGroup } from "@/modules/reference/parliamentary-groups/queries";

import { createAmendmentAction, removeAmendmentAction, saveAmendmentAction } from "./actions";
import { getAmendments } from "./queries";
import { createText } from "../texts/queries";

vi.mock("@/modules/editors/session", () => ({ getSignedInEmail: vi.fn(async () => "editrice@example.fr") }));

// What the amendment form sends: every field as typed.
const form = {
  number: " 12",
  authorLabel: " Mme Claire Martin ",
  authorGroupId: "",
  cosignatories: " ",
  summary: "L’amendement avance la date d’entrée en vigueur.",
  fate: "rejected",
  governmentOpinion: "unfavourable",
  committeeOpinion: "none",
  status: "draft",
};

async function draftTextId() {
  const text = await createText({
    nature: "member_bill",
    number: 230,
    officialTitle: "Proposition de loi visant à renforcer la prévention en santé",
    filedOn: "2026-10-03",
    officialUrl: null,
    summary: "Le texte crée un rendez-vous de prévention.",
    subtopicIds: [],
  });
  if (!text.ok) throw new Error("Could not create the text");
  return text.id;
}

describe("amendment actions", () => {
  beforeEach(async () => {
    await db.insert(editors).values({ email: "editrice@example.fr" });
    vi.mocked(revalidatePath).mockClear();
  });

  it("save an amendment as typed, publish it, and regenerate the public pages", async () => {
    const textId = await draftTextId();
    const group = await createParliamentaryGroup({ name: "Groupe GAU", abbreviation: "GAU", partyIds: [] });
    if (!group.ok) throw new Error("Could not create the group");

    expect(await createAmendmentAction(textId, form)).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    const [created] = await getAmendments(textId);
    expect(created).toEqual({
      id: expect.any(String),
      number: 12,
      authorLabel: "Mme Claire Martin",
      authorGroupId: null,
      cosignatories: null,
      summary: "L’amendement avance la date d’entrée en vigueur.",
      fate: "rejected",
      governmentOpinion: "unfavourable",
      committeeOpinion: "none",
      status: "draft",
      vote: null,
      sourceIds: [],
    });

    const published = { ...form, authorGroupId: group.id, cosignatories: "M. Paul Durand", status: "published" };
    expect(await saveAmendmentAction(created.id, published)).toEqual({ ok: true });
    expect(await getAmendments(textId)).toMatchObject([
      { authorGroupId: group.id, cosignatories: "M. Paul Durand", status: "published" },
    ]);

    expect(await removeAmendmentAction(created.id)).toEqual({ ok: true });
    expect(await getAmendments(textId)).toEqual([]);
  });

  it("explain why an amendment cannot be saved, and write nothing", async () => {
    const textId = await draftTextId();
    await createAmendmentAction(textId, form);

    expect(await createAmendmentAction(textId, { ...form, status: "published" })).toEqual({
      ok: false,
      message: "L’amendement n°\u00a012 est déjà saisi pour ce texte.",
    });
    expect(await createAmendmentAction(textId, { ...form, number: "" })).toEqual({
      ok: false,
      message: "Saisissez le numéro de l’amendement.",
    });
    expect(await createAmendmentAction(textId, { ...form, number: "13", authorLabel: " " })).toEqual({
      ok: false,
      message: "Saisissez l’auteur de l’amendement.",
    });
    expect(await createAmendmentAction(textId, { ...form, number: "13", summary: "" })).toEqual({
      ok: false,
      message: "Saisissez le résumé éditorial.",
    });
    expect(await createAmendmentAction(textId, { ...form, number: "13", fate: "" })).toEqual({
      ok: false,
      message: "Choisissez le sort de l’amendement.",
    });
    expect(await getAmendments(textId)).toMatchObject([{ number: 12, status: "draft" }]);
  });

  it("keep the group of an amendment's author, with a reason that covers it", async () => {
    const textId = await draftTextId();
    const group = await createParliamentaryGroup({ name: "Groupe GAU", abbreviation: "GAU", partyIds: [] });
    if (!group.ok) throw new Error("Could not create the group");
    await createAmendmentAction(textId, { ...form, authorGroupId: group.id });

    expect(await removeParliamentaryGroupAction(group.id)).toEqual({
      ok: false,
      message: "Ce groupe a voté dans un scrutin ou est celui de l’auteur d’un amendement : il ne peut plus être supprimé.",
    });
  });
});


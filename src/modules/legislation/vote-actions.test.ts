import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { editors } from "@/modules/editors/schema";
import { createParliamentaryGroup } from "@/modules/reference/parliamentary-groups";

import { createVoteAction, saveVoteAction } from "./actions";
import { createAmendment } from "./amendments";
import { createText } from "./texts";
import { getVotes } from "./votes";

vi.mock("@/modules/editors/session", () => ({ getSignedInEmail: vi.fn(async () => "editrice@example.fr") }));

// What the scrutin form sends: every field as typed, one row per group.
const form = {
  subject: "whole_text",
  number: "412",
  heldOn: "2026-09-30",
  result: "adopted",
  officialUrl: " ",
};

const blankCounts = { for: "", against: "", abstention: "", nonVoting: "" };

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

async function groupId(abbreviation: string) {
  const group = await createParliamentaryGroup({ name: `Groupe ${abbreviation}`, abbreviation, partyIds: [] });
  if (!group.ok) throw new Error(`Could not create ${abbreviation}`);
  return group.id;
}

describe("scrutin actions", () => {
  beforeEach(async () => {
    await db.insert(editors).values({ email: "editrice@example.fr" });
    vi.mocked(revalidatePath).mockClear();
  });

  it("save a scrutin as typed, with a count or without, and regenerate the public pages", async () => {
    const textId = await draftTextId();
    const [left, right] = [await groupId("GAU"), await groupId("DRO")];

    const created = await createVoteAction(textId, {
      ...form,
      groupVotes: [
        { groupId: left, position: "for", counts: { for: "30", against: " 2", abstention: "1", nonVoting: "0" } },
        { groupId: right, position: "against", counts: blankCounts },
      ],
    });

    expect(created).toEqual({ ok: true });
    expect(await getVotes(textId)).toEqual([
      {
        id: expect.any(String),
        subject: "whole_text",
        number: 412,
        heldOn: "2026-09-30",
        result: "adopted",
        officialUrl: null,
        amendmentId: null,
        groupVotes: [
          { groupId: left, position: "for", counts: { for: 30, against: 2, abstention: 1, nonVoting: 0 } },
          { groupId: right, position: "against", counts: null },
        ],
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("refuse a negative, partial or incoherent count, or a group without position, and write nothing", async () => {
    const textId = await draftTextId();
    const left = await groupId("GAU");
    const counted = (position: string, counts: typeof blankCounts) => ({
      ...form,
      groupVotes: [{ groupId: left, position, counts }],
    });

    expect(await createVoteAction(textId, counted("", blankCounts))).toEqual({
      ok: false,
      message: "Choisissez la position majoritaire de chaque groupe.",
    });
    expect(
      await createVoteAction(textId, counted("for", { for: "12", against: "-3", abstention: "0", nonVoting: "0" })),
    ).toEqual({ ok: false, message: "Un décompte est un nombre entier, positif ou nul." });
    expect(await createVoteAction(textId, counted("for", { ...blankCounts, for: "12" }))).toEqual({
      ok: false,
      message: "Saisissez les quatre nombres du décompte d’un groupe, ou aucun.",
    });
    expect(
      await createVoteAction(textId, counted("for", { for: "3", against: "20", abstention: "0", nonVoting: "0" })),
    ).toEqual({ ok: false, message: "Le décompte d’un groupe ne correspond pas à sa position majoritaire." });
    expect(
      await createVoteAction(textId, counted("non_voting", { for: "1", against: "0", abstention: "0", nonVoting: "8" })),
    ).toEqual({ ok: false, message: "Le décompte d’un groupe ne correspond pas à sa position majoritaire." });
    expect(await getVotes(textId)).toEqual([]);
  });

  it("accept a tie, and a minority of non-voting members alongside the majority position", async () => {
    const textId = await draftTextId();
    const left = await groupId("GAU");

    expect(
      await createVoteAction(textId, {
        ...form,
        groupVotes: [
          { groupId: left, position: "against", counts: { for: "10", against: "10", abstention: "0", nonVoting: "25" } },
        ],
      }),
    ).toEqual({ ok: true });
  });

  it("explain why a scrutin cannot be saved", async () => {
    const textId = await draftTextId();
    const left = await groupId("GAU");
    const once = { groupId: left, position: "for", counts: blankCounts };
    await createVoteAction(textId, { ...form, groupVotes: [once] });
    const [vote] = await getVotes(textId);

    expect(await createVoteAction(textId, { ...form, groupVotes: [] })).toEqual({
      ok: false,
      message: "Le scrutin n°\u00a0412 est déjà saisi pour ce texte.",
    });
    expect(await saveVoteAction(vote.id, { ...form, groupVotes: [once, once] })).toEqual({
      ok: false,
      message: "Un groupe ne vote qu’une fois par scrutin.",
    });
    expect(await createVoteAction(textId, { ...form, number: "", groupVotes: [] })).toEqual({
      ok: false,
      message: "Saisissez le numéro du scrutin.",
    });
    expect(await saveVoteAction(vote.id, { ...form, result: "", groupVotes: [once] })).toEqual({
      ok: false,
      message: "Choisissez le résultat du scrutin.",
    });

    await groupId("DRO");
    expect(await saveVoteAction(vote.id, { ...form, groupVotes: [once] })).toEqual({
      ok: false,
      message:
        "Saisissez la position de chaque groupe de la législature en cours : rechargez la page pour voir la liste à jour.",
    });
  });

  it("link a scrutin on an amendment to it, never another kind of scrutin, and only once", async () => {
    const textId = await draftTextId();
    const amendment = await createAmendment(textId, {
      number: 12,
      authorLabel: "Mme Claire Martin",
      authorGroupId: null,
      cosignatories: null,
      summary: "L’amendement avance la date d’entrée en vigueur.",
      fate: "rejected",
      governmentOpinion: "unfavourable",
      committeeOpinion: "unfavourable",
      status: "draft",
    });
    if (!amendment.ok) throw new Error("Could not create the amendment");
    const onAmendment = { ...form, subject: "amendment", groupVotes: [] };

    expect(await createVoteAction(textId, { ...onAmendment, amendmentId: amendment.id })).toEqual({ ok: true });
    expect(await createVoteAction(textId, { ...form, number: "413", amendmentId: amendment.id, groupVotes: [] })).toEqual({
      ok: true,
    });
    expect(await createVoteAction(textId, { ...onAmendment, number: "414", amendmentId: "" })).toEqual({ ok: true });
    expect((await getVotes(textId)).map((vote) => [vote.number, vote.amendmentId])).toEqual([
      [413, null],
      [412, amendment.id],
      [414, null],
    ]);

    expect(await createVoteAction(textId, { ...onAmendment, number: "415", amendmentId: amendment.id })).toEqual({
      ok: false,
      message: "Cet amendement est déjà relié à un autre scrutin.",
    });
  });
});


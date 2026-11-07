import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { editors } from "@/modules/editors/schema";
import { removeSourceAction } from "@/modules/reference/sources/actions";
import { createSource } from "@/modules/reference/sources/queries";
import { createSubtopic, createTopic } from "@/modules/reference/topics/queries";

import { createTextAction, saveTextAction } from "./actions";
import { getPublishedText, getText, getTexts } from "./queries";

vi.mock("@/modules/editors/session", () => ({ getSignedInEmail: vi.fn(async () => "editrice@example.fr") }));

// What the text form sends: every field as typed.
const form = {
  nature: "member_bill",
  number: "412",
  officialTitle: " Proposition de loi visant à renforcer la prévention en santé ",
  filedOn: "2026-10-03",
  officialUrl: "",
  summary: " Le texte crée un rendez-vous de prévention gratuit à 25, 45 et 65 ans. ",
  subtopicIds: [] as string[],
};

async function subtopicId() {
  const topic = await createTopic({ name: "Santé", slug: "sante" });
  if (!topic.ok) throw new Error("Could not create Santé");
  const subtopic = await createSubtopic(topic.id, { name: "Prévention", slug: "prevention" });
  if (!subtopic.ok) throw new Error("Could not create Prévention");
  return subtopic.id;
}

describe("text actions", () => {
  beforeEach(async () => {
    await db.insert(editors).values({ email: "editrice@example.fr" });
    vi.mocked(revalidatePath).mockClear();
  });

  it("save a text as typed, without an official link, and regenerate the public pages", async () => {
    const prevention = await subtopicId();

    expect(await createTextAction({ ...form, subtopicIds: [prevention, prevention], status: "published" })).toEqual({
      ok: true,
    });
    const [text] = await getTexts();
    expect(await getPublishedText(text.id)).toMatchObject({
      number: 412,
      officialTitle: "Proposition de loi visant à renforcer la prévention en santé",
      officialUrl: null,
      summary: "Le texte crée un rendez-vous de prévention gratuit à 25, 45 et 65 ans.",
      subtopics: [{ id: prevention }],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("regenerate the public pages when a text is published or edited", async () => {
    const prevention = await subtopicId();
    await createTextAction({ ...form, subtopicIds: [prevention] });
    const [text] = await getTexts();
    vi.mocked(revalidatePath).mockClear();

    expect(await saveTextAction(text.id, { status: "published" })).toEqual({ ok: true });
    expect(await saveTextAction(text.id, { summary: "Un résumé revu." })).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledTimes(2);
    expect(await getPublishedText(text.id)).toMatchObject({ summary: "Un résumé revu." });
  });

  it("explain why a text cannot be published or saved", async () => {
    await createTextAction(form);
    const [text] = await getTexts();

    expect(await saveTextAction(text.id, { status: "published" })).toEqual({
      ok: false,
      message: "Rattachez le texte à au moins une sous-thématique avant de le publier.",
    });
    expect(await createTextAction(form)).toEqual({
      ok: false,
      message: "Le numéro 412 est déjà pris par un autre texte de la législature.",
    });
    expect(await createTextAction({ ...form, officialUrl: "javascript:alert(1)" })).toEqual({
      ok: false,
      message: "Saisissez un lien complet, qui commence par http:// ou https://.",
    });
    expect(await createTextAction({ ...form, number: "" })).toEqual({
      ok: false,
      message: "Saisissez le numéro du texte.",
    });
    expect(await createTextAction({ ...form, summary: "  " })).toEqual({
      ok: false,
      message: "Saisissez le résumé éditorial.",
    });
    expect(await saveTextAction(text.id, {})).toEqual({ ok: false, message: "Aucune modification à enregistrer." });
  });

  it("link the sources picked, each once, and keep a source that backs a text from deletion", async () => {
    const { id: sourceId } = await createSource({
      title: "Proposition de loi n° 412",
      organization: "Assemblée nationale",
      url: "https://assemblee.example.org/textes/412",
      consultedOn: "2026-10-04",
      kind: "official_text",
    });

    expect(await createTextAction({ ...form, sourceIds: [sourceId, sourceId] })).toEqual({ ok: true });
    const [text] = await getTexts();
    expect(text.sourceIds).toEqual([sourceId]);

    expect(await removeSourceAction(sourceId)).toEqual({
      ok: false,
      message: "Un contenu renvoie encore à cette source : retirez-la de ce contenu avant de la supprimer.",
    });

    expect(await saveTextAction(text.id, { sourceIds: [] })).toEqual({ ok: true });
    expect((await getText(text.id))?.sourceIds).toEqual([]);
    expect(await removeSourceAction(sourceId)).toEqual({ ok: true });
  });
});

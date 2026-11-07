import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { editors } from "@/modules/editors/schema";
import { createParty, getParties } from "@/modules/reference/parties/queries";
import { createSource } from "@/modules/reference/sources/queries";
import { createSubtopic, createTopic } from "@/modules/reference/topics/queries";

import { createExtractAction, moveExtractAction, removeExtractAction, saveExtractAction } from "./actions";
import { getExtracts, getPublishedProgramme } from "./queries";

vi.mock("@/modules/editors/session", () => ({ getSignedInEmail: vi.fn(async () => "editrice@example.fr") }));

// What the extract form sends: every field as typed.
const form = {
  quote: "  Nous rendrons gratuit un bilan de prévention à 25, 45 et 65 ans.\n",
  recordedOn: "2026-10-12",
};

async function fixtures() {
  const topic = await createTopic({ name: "Santé", slug: "sante" });
  const subtopic = topic.ok && (await createSubtopic(topic.id, { name: "Prévention", slug: "prevention" }));
  if (!subtopic || !subtopic.ok) throw new Error("Could not create the subtopic");
  await createParty({ name: "Parti de l'Horizon", abbreviation: "PDH", candidacy: { candidateName: null, status: "published" } });
  const [party] = await getParties();
  const source = await createSource({
    title: "Programme",
    organization: "Parti de l'Horizon",
    url: "https://horizon.example.org/programme",
    consultedOn: "2026-10-12",
    kind: "program",
  });
  return { subtopicId: subtopic.id, candidacyId: party.candidacy!.id, sourceId: source.id };
}

describe("extract actions", () => {
  beforeEach(async () => {
    await db.insert(editors).values({ email: "editrice@example.fr" });
    vi.mocked(revalidatePath).mockClear();
  });

  it("save an extract as typed, each source once, and regenerate the public pages", async () => {
    const { subtopicId, candidacyId, sourceId } = await fixtures();

    expect(
      await createExtractAction(candidacyId, { ...form, subtopicId, sourceIds: [sourceId, sourceId], status: "published" }),
    ).toEqual({ ok: true });

    expect(await getPublishedProgramme(candidacyId)).toMatchObject([
      { quote: "Nous rendrons gratuit un bilan de prévention à 25, 45 et 65 ans.", sources: [{ id: sourceId }] },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("edit, reorder and delete an extract", async () => {
    const { subtopicId, candidacyId } = await fixtures();
    await createExtractAction(candidacyId, { ...form, subtopicId });
    await createExtractAction(candidacyId, { ...form, quote: "Deuxième", subtopicId });
    const [first, second] = await getExtracts(candidacyId);

    expect(await saveExtractAction(first.id, { recordedOn: "2026-11-05", status: "published" })).toEqual({ ok: true });
    expect(await moveExtractAction(second.id, "up")).toEqual({ ok: true });
    expect(await removeExtractAction(second.id)).toEqual({ ok: true });

    expect(await getExtracts(candidacyId)).toMatchObject([{ id: first.id, recordedOn: "2026-11-05", status: "published" }]);
  });

  it("explain what is missing from the form", async () => {
    const { subtopicId, candidacyId } = await fixtures();

    expect(await createExtractAction(candidacyId, { ...form, quote: "   ", subtopicId })).toEqual({
      ok: false,
      message: "Collez la citation du programme.",
    });
    expect(await createExtractAction(candidacyId, { ...form, subtopicId: "" })).toEqual({
      ok: false,
      message: "Choisissez la sous-thématique.",
    });
    expect(await createExtractAction(candidacyId, { ...form, recordedOn: "", subtopicId })).toEqual({
      ok: false,
      message: "Saisissez la date de relevé.",
    });
    expect(await getExtracts(candidacyId)).toEqual([]);
  });
});

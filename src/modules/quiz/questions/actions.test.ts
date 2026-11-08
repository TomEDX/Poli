import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { editors } from "@/modules/editors/schema";
import { createParty, getParties } from "@/modules/reference/parties/queries";
import { createSubtopic, createTopic } from "@/modules/reference/topics/queries";

import { createQuestionAction, moveQuestionAction, removeQuestionAction, saveQuestionAction } from "./actions";
import { getPublishedQuiz, getQuestions } from "./queries";

vi.mock("@/modules/editors/session", () => ({ getSignedInEmail: vi.fn(async () => "editrice@example.fr") }));

async function fixtures() {
  const topic = await createTopic({ name: "Santé", slug: "sante" });
  const subtopic = topic.ok && (await createSubtopic(topic.id, { name: "Prévention", slug: "prevention" }));
  if (!subtopic || !subtopic.ok) throw new Error("Could not create the subtopic");
  await createParty({ name: "Parti de l'Horizon", abbreviation: "PDH", candidacy: { candidateName: null, status: "published" } });
  const [party] = await getParties();
  return { subtopicId: subtopic.id, candidacyId: party.candidacy!.id };
}

describe("question actions", () => {
  beforeEach(async () => {
    await db.insert(editors).values({ email: "editrice@example.fr" });
    vi.mocked(revalidatePath).mockClear();
  });

  it("save a question as typed with its positions, and regenerate the public pages", async () => {
    const { subtopicId, candidacyId } = await fixtures();

    expect(
      await createQuestionAction({
        subtopicId,
        statement: "  Il faut rendre gratuits les bilans de prévention.\n",
        positions: [{ candidacyId, value: -1 }],
        status: "published",
      }),
    ).toEqual({ ok: true });

    expect(await getPublishedQuiz()).toMatchObject([
      {
        statement: "Il faut rendre gratuits les bilans de prévention.",
        positions: [{ candidacyId, value: -1, source: null }],
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("edit, reorder, publish and delete questions", async () => {
    const { subtopicId, candidacyId } = await fixtures();
    await createQuestionAction({ subtopicId, statement: "Première" });
    await createQuestionAction({ subtopicId, statement: "Deuxième" });
    const [first, second] = await getQuestions();

    expect(
      await saveQuestionAction(first.id, { positions: [{ candidacyId, value: null }], status: "published" }),
    ).toEqual({ ok: true });
    expect(await moveQuestionAction(second.id, "up")).toEqual({ ok: true });
    expect((await getQuestions()).map((question) => question.statement)).toEqual(["Deuxième", "Première"]);
    expect(await removeQuestionAction(second.id)).toEqual({ ok: true });

    expect(await getQuestions()).toMatchObject([
      { id: first.id, status: "published", positions: [{ candidacyId, value: null, sourceId: null }] },
    ]);
  });

  it("explain what is wrong in the form", async () => {
    const { subtopicId, candidacyId } = await fixtures();

    expect(await createQuestionAction({ subtopicId, statement: "   " })).toEqual({
      ok: false,
      message: "Rédigez l’affirmation.",
    });
    expect(await createQuestionAction({ subtopicId: "", statement: "Une affirmation" })).toEqual({
      ok: false,
      message: "Choisissez la sous-thématique.",
    });
    expect(
      await createQuestionAction({ subtopicId, statement: "Une affirmation", positions: [{ candidacyId, value: 3 }] }),
    ).toEqual({ ok: false, message: "Choisissez une position sur l’échelle, ou « pas de position »." });
    expect(
      await createQuestionAction({
        subtopicId,
        statement: "Une affirmation",
        positions: [
          { candidacyId, value: 1 },
          { candidacyId, value: 2 },
        ],
      }),
    ).toEqual({ ok: false, message: "Une candidature n’a qu’une position par question." });
    expect(await getQuestions()).toEqual([]);
  });
});

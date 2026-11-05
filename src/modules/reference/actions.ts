"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { editorAction } from "@/modules/editors/authorization";

import {
  createSubtopic,
  createTopic,
  type DeleteResult,
  deleteSubtopic,
  deleteTopic,
  moveSubtopic,
  moveTopic,
  renameSubtopic,
  renameTopic,
  type WriteResult,
} from "./topics";
import { topicFormSchema } from "./validation";

export type TopicFormState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: string; values: { name: string; slug: string } };

export type DeleteState = { status: "idle" } | { status: "error"; message: string };

const optionalId = z.uuid().optional().catch(undefined);
const moveSchema = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) });

const goneMessage = "Cet élément n'existe plus : rechargez la page.";

// Topics feed every public page, which are regenerated after each change (ADR 0005).
function regeneratePublicPages() {
  revalidatePath("/", "layout");
}

function formValues(formData: FormData) {
  return { name: String(formData.get("name") ?? ""), slug: String(formData.get("slug") ?? "") };
}

async function save(
  formData: FormData,
  write: (input: { name: string; slug: string }) => Promise<WriteResult>,
  slugTakenMessage: (slug: string) => string,
): Promise<TopicFormState> {
  const values = formValues(formData);
  const parsed = topicFormSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message, values };
  }
  const result = await write(parsed.data);
  if (!result.ok) {
    const message = result.reason === "slug-taken" ? slugTakenMessage(parsed.data.slug) : goneMessage;
    return { status: "error", message, values };
  }
  regeneratePublicPages();
  return { status: "saved" };
}

export const saveTopic = editorAction(
  async (_editor, _state: TopicFormState, formData: FormData): Promise<TopicFormState> => {
    const id = optionalId.parse(formData.get("id") ?? undefined);
    return save(
      formData,
      (input) => (id ? renameTopic(id, input) : createTopic(input)),
      (slug) => `L'identifiant « ${slug} » est déjà pris par une autre thématique.`,
    );
  },
);

export const saveSubtopic = editorAction(
  async (_editor, _state: TopicFormState, formData: FormData): Promise<TopicFormState> => {
    const id = optionalId.parse(formData.get("id") ?? undefined);
    const topicId = optionalId.parse(formData.get("topicId") ?? undefined);
    return save(
      formData,
      async (input) => {
        if (id) return renameSubtopic(id, input);
        if (topicId) return createSubtopic(topicId, input);
        return { ok: false, reason: "not-found" };
      },
      (slug) => `L'identifiant « ${slug} » est déjà pris par une autre sous-thématique de cette thématique.`,
    );
  },
);

export const moveTopicAction = editorAction(async (_editor, formData: FormData) => {
  const parsed = moveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await moveTopic(parsed.data.id, parsed.data.direction);
  regeneratePublicPages();
});

export const moveSubtopicAction = editorAction(async (_editor, formData: FormData) => {
  const parsed = moveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await moveSubtopic(parsed.data.id, parsed.data.direction);
  regeneratePublicPages();
});

async function removeWith(
  formData: FormData,
  remove: (id: string) => Promise<DeleteResult>,
  inUseMessage: string,
): Promise<DeleteState> {
  const id = optionalId.parse(formData.get("id") ?? undefined);
  const result: DeleteResult = id ? await remove(id) : { ok: false, reason: "not-found" };
  if (!result.ok) {
    return { status: "error", message: result.reason === "in-use" ? inUseMessage : goneMessage };
  }
  regeneratePublicPages();
  return { status: "idle" };
}

export const deleteTopicAction = editorAction(
  async (_editor, _state: DeleteState, formData: FormData): Promise<DeleteState> =>
    removeWith(
      formData,
      deleteTopic,
      "Une de ses sous-thématiques est utilisée par du contenu : rattachez ce contenu à une autre sous-thématique avant de supprimer la thématique.",
    ),
);

export const deleteSubtopicAction = editorAction(
  async (_editor, _state: DeleteState, formData: FormData): Promise<DeleteState> =>
    removeWith(
      formData,
      deleteSubtopic,
      "Cette sous-thématique est utilisée par du contenu : rattachez ce contenu à une autre sous-thématique avant de la supprimer.",
    ),
);

import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db";

import { type Editor, editors } from "./schema";
import { getSignedInEmail } from "./session";

export class EditorAccessDeniedError extends Error {
  constructor() {
    super("This action is reserved for signed-in editors.");
    this.name = "EditorAccessDeniedError";
  }
}

export const getCurrentEditor = cache(async (): Promise<Editor | null> => {
  const email = await getSignedInEmail();
  if (!email) return null;
  const [editor] = await db.select().from(editors).where(eq(editors.email, email.toLowerCase()));
  return editor ?? null;
});

export async function requireEditor(): Promise<Editor> {
  const editor = await getCurrentEditor();
  if (!editor) throw new EditorAccessDeniedError();
  return editor;
}

// Wraps every write Server Action: the database lets the app write as postgres,
// so this check is what keeps visitors out (ADR 0007).
export function editorAction<Args extends unknown[], Result>(
  action: (editor: Editor, ...args: Args) => Promise<Result>,
) {
  return async (...args: Args): Promise<Result> => action(await requireEditor(), ...args);
}

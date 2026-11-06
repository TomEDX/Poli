import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db";

import { type Editor, editors } from "./schema";
import { getSignedInEmail } from "./session";

// The editor behind the current request, or null for a visitor.
export const getCurrentEditor = cache(async (): Promise<Editor | null> => {
  const email = await getSignedInEmail();
  if (!email) return null;
  const [editor] = await db.select().from(editors).where(eq(editors.email, email.toLowerCase()));
  return editor ?? null;
});

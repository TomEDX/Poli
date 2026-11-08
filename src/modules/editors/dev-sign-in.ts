import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { db } from "@/lib/db";

import { AuthErrorCode } from "./auth-errors";
import { editors } from "./schema";
import { createSupabaseServerClient } from "./supabase";

export const DEV_EDITOR_EMAIL = "editeur@poli.test";

const LOCAL_HOSTNAMES = ["127.0.0.1", "localhost"];

// The one-click sign-in only exists under `next dev` against the local Supabase. `pnpm dev`
// writes its secret key to .env.development.local; deployed environments also set one, for the
// party logos, so the environment and the local address are what keep the button out of them.
export function isDevSignInEnabled(): boolean {
  const url = process.env.SUPABASE_URL;
  return (
    process.env.NODE_ENV === "development" &&
    Boolean(process.env.SUPABASE_SECRET_KEY) &&
    url !== undefined &&
    LOCAL_HOSTNAMES.includes(new URL(url).hostname)
  );
}

/**
 * Signs the browser in as the local test editor, creating it on first use. The session
 * comes from a real magic link, generated and verified on the server, so the rest of the
 * app runs exactly as after an e-mailed link. Verifying the token hash skips PKCE, which
 * is what ties the e-mailed link to the browser that asked for it.
 */
export async function openDevEditorSession(): Promise<void> {
  if (!isDevSignInEnabled()) throw new Error("The dev sign-in only runs locally under next dev.");

  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await ensureDevEditor(admin.auth.admin);

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: DEV_EDITOR_EMAIL });
  if (error) throw error;

  const supabase = await createSupabaseServerClient();
  const verified = await supabase.auth.verifyOtp({ type: "email", token_hash: data.properties.hashed_token });
  if (verified.error) throw verified.error;
}

async function ensureDevEditor(authAdmin: SupabaseClient["auth"]["admin"]) {
  const { error } = await authAdmin.createUser({ email: DEV_EDITOR_EMAIL, email_confirm: true });
  if (error && error.code !== AuthErrorCode.EMAIL_EXISTS) throw error;
  await db.insert(editors).values({ email: DEV_EDITOR_EMAIL }).onConflictDoNothing();
}

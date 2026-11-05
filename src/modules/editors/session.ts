import { connection } from "next/server";

import { isUnknownAccount } from "./auth-errors";
import { createSupabaseServerClient } from "./supabase";

export async function getSignedInEmail(): Promise<string | null> {
  // Checking the token reads the current time, which may only happen at request time.
  await connection();
  const supabase = await createSupabaseServerClient();
  // getClaims verifies the token signature, unlike getSession which trusts the cookie.
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;
  return typeof email === "string" && email !== "" ? email : null;
}

export type MagicLinkRequest = "sent" | "rate-limited" | "failed";

export async function requestMagicLink(email: string, redirectTo: string): Promise<MagicLinkRequest> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });
  // An unknown address counts as sent, so the form does not reveal who is an editor.
  if (!error || isUnknownAccount(error.code)) return "sent";
  if (error.status === 429) return "rate-limited";
  console.error("Magic link could not be sent", error);
  return "failed";
}

// Supabase sends the magic link back with a PKCE code. Exchanging it needs the
// verifier cookie set when the link was requested, so the link only works in
// the browser that asked for it. Free projects cannot change the e-mail template
// to use a token hash instead.
export async function openSessionFromMagicLink(code: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return !error;
}

export async function closeSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

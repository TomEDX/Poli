"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { closeSession, requestMagicLink } from "./session";
import { signInSchema } from "./validation";

export type SignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

export async function sendMagicLink(_state: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: "Saisissez une adresse e-mail valide." };
  }
  const { email } = parsed.data;

  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const result = await requestMagicLink(email, `${protocol}://${host}/auth/confirm`);

  if (result === "sent") return { status: "sent", email };
  if (result === "rate-limited") {
    return { status: "error", message: "Trop de demandes de lien. Réessayez dans quelques minutes." };
  }
  return { status: "error", message: "Le lien n'a pas pu être envoyé. Réessayez plus tard." };
}

export async function signOut() {
  await closeSession();
  redirect("/sign-in");
}

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { openSessionFromMagicLink } from "@/modules/editors/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code && (await openSessionFromMagicLink(code))) redirect("/admin");
  redirect("/sign-in?error=invalid-link");
}

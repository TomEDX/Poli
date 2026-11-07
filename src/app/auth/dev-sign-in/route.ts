import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

import { isDevSignInEnabled, openDevEditorSession } from "@/modules/editors/dev-sign-in";

export async function POST(request: NextRequest) {
  if (!isDevSignInEnabled()) notFound();
  await openDevEditorSession();
  // 303 so the browser follows the form post with a GET.
  return NextResponse.redirect(new URL("/admin", request.url), 303);
}

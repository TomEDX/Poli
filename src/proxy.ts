import type { NextRequest } from "next/server";

import { refreshEditorSession } from "@/modules/editors/proxy";

export function proxy(request: NextRequest) {
  return refreshEditorSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};

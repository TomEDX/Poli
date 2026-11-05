import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { supabaseConfig } from "./config";

// Refreshes the Supabase session cookies before the admin renders, and sends
// visitors without a session to the sign-in page. Only an optimistic check:
// pages and Server Actions still verify the editor themselves.
export async function refreshEditorSession(request: NextRequest) {
  const { url, publishableKey } = supabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (data?.claims) return response;

  const redirect = NextResponse.redirect(new URL("/sign-in", request.url));
  // Keeps the cleared session cookies when the refresh failed.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

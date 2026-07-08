import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE / OAuth code exchange for email invite & recovery links.
 * Prefer redirecting auth emails here: /auth/callback?next=/auth/set-password
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/auth/set-password";
  const safeNext = next.startsWith("/") ? next : "/auth/set-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, url.origin));
    }
  }

  return NextResponse.redirect(
    new URL(
      `/auth/set-password?error=${encodeURIComponent(
        "This link has expired or was already used."
      )}`,
      url.origin
    )
  );
}

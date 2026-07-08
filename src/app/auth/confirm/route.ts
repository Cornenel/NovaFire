import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/**
 * Handles Supabase email links that use the token_hash format
 * (invite / recovery / email confirmation), then forwards the user on –
 * by default to the set-password screen.
 *
 * Cookies are written onto the redirect response so the session survives
 * across devices (unlike PKCE ?code= links that need a browser verifier).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/auth/set-password";
  const safeNext = next.startsWith("/") ? next : "/auth/set-password";

  const redirectUrl = new URL(safeNext, url.origin);
  let response = NextResponse.redirect(redirectUrl);

  if (tokenHash && type) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.redirect(redirectUrl);
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return response;
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

"use client";

import { useEffect } from "react";

const SET_PASSWORD_PATHS = ["/auth/set-password", "/reset-password", "/auth/callback", "/auth/confirm"];

/**
 * Supabase recovery / invite emails often land on the Site URL (homepage) with:
 * - PKCE: ?code=…
 * - implicit: #access_token=…&type=recovery
 * - token hash: ?token_hash=…&type=recovery
 *
 * Forward those to the set-password / confirm handlers so users are not stuck
 * on the marketing homepage.
 */
export function AuthHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { pathname, hash, search } = window.location;
    if (SET_PASSWORD_PATHS.some((path) => pathname.startsWith(path))) return;

    const searchParams = new URLSearchParams(search);
    const hashParams = hash.length > 1 ? new URLSearchParams(hash.slice(1)) : null;

    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type =
      searchParams.get("type") || hashParams?.get("type") || "";
    const accessToken = hashParams?.get("access_token");
    const refreshToken = hashParams?.get("refresh_token");
    const hasHashSession = Boolean(accessToken && refreshToken);

    // token_hash links (device-safe) → /auth/confirm
    if (tokenHash && type) {
      const next = new URLSearchParams({
        token_hash: tokenHash,
        type,
        next: "/auth/set-password",
      });
      window.location.replace(`/auth/confirm?${next.toString()}`);
      return;
    }

    // PKCE code on the wrong page → exchange via callback, then set-password
    if (code) {
      const next = new URLSearchParams({
        code,
        next: "/auth/set-password",
      });
      window.location.replace(`/auth/callback?${next.toString()}`);
      return;
    }

    // Implicit hash tokens → set-password (keep hash for setSession)
    if (hasHashSession) {
      window.location.replace(`/auth/set-password${search}${hash}`);
      return;
    }

    // Hash type without tokens is not actionable
    if (
      type === "recovery" ||
      type === "invite" ||
      type === "signup" ||
      type === "magiclink"
    ) {
      // Fall through only when there is still a hash payload worth keeping
      if (hashParams && [...hashParams.keys()].length > 0) {
        window.location.replace(`/auth/set-password${search}${hash}`);
      }
    }
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";

/**
 * Supabase dashboard recovery / invite emails often redirect to the Site URL
 * with tokens in the URL hash (#access_token=…&type=recovery). Those hashes are
 * invisible to the server. Forward them to /auth/set-password so the user can
 * finish setting a password instead of seeing a normal login form.
 */
export function AuthHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { pathname, hash, search } = window.location;
    if (!hash || hash.length < 2) return;
    if (pathname.startsWith("/auth/set-password") || pathname.startsWith("/reset-password")) {
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const type = params.get("type");
    const hasToken =
      Boolean(params.get("access_token")) || Boolean(params.get("refresh_token"));

    const isAuthCallback =
      type === "recovery" ||
      type === "invite" ||
      type === "signup" ||
      type === "magiclink" ||
      (hasToken && (type === "email" || !type));

    if (!isAuthCallback && !hasToken) return;
    if (!hasToken && !search.includes("code=")) return;

    // Keep the hash so SetPasswordForm can call setSession().
    window.location.replace(`/auth/set-password${search}${hash}`);
  }, []);

  return null;
}

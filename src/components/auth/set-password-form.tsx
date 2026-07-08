"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Finishes an invite / password-reset flow. Supabase email links may arrive as:
 * - PKCE: ?code=...
 * - implicit: #access_token=...&refresh_token=...
 * - already verified via /auth/confirm (session cookie present)
 */
export function SetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      // PKCE invite / recovery links: ?code=...
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        // Strip the one-time code from the URL either way so refresh does not
        // re-attempt a consumed code and show a false "expired" state.
        window.history.replaceState(null, "", window.location.pathname);
        if (exchangeError) {
          setError(exchangeError.message);
          setHasSession(false);
          setReady(true);
          return;
        }
      } else {
        // Hash-token links: #access_token=...&refresh_token=...
        const hash = window.location.hash.slice(1);
        if (hash.includes("access_token")) {
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            window.history.replaceState(null, "", window.location.pathname);
          }
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setHasSession(Boolean(user));
      setReady(true);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/tech");
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-5 text-center">
        <p className="text-sm text-zinc-300 mb-2">
          {error || "This link has expired or was already used."}
        </p>
        <p className="text-xs text-zinc-500">
          Ask your administrator to send a new invite, or{" "}
          <Link href="/tech-login" className="text-red-400 hover:underline">
            sign in
          </Link>{" "}
          if you already have a password.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/[0.08] nf-glass-panel p-5 space-y-4"
    >
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">
          New password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full px-4 py-3 rounded-xl bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">
          Confirm password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full px-4 py-3 rounded-xl bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <KeyRound className="w-4 h-4" />
        )}
        Set password & sign in
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      "/auth/set-password"
    )}`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen nf-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
            Nova<span className="text-red-600">Fire</span>
          </p>
          <h1 className="text-lg font-semibold text-white mt-4">
            Reset your password
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            We will email you a link to choose a new password.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-5 text-center space-y-3">
            <p className="text-sm text-zinc-200">
              If an account exists for that email, a reset link is on its way.
            </p>
            <p className="text-xs text-zinc-500">
              Open the link on this device, then set a new password.
            </p>
            <Link
              href="/tech-login"
              className="inline-block text-sm text-red-400 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-white/[0.08] nf-glass-panel p-5 space-y-4"
          >
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                placeholder="you@company.co.za"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              Send reset link
            </button>

            <p className="text-center text-xs text-zinc-500">
              <Link href="/tech-login" className="text-zinc-400 hover:text-white">
                Staff sign in
              </Link>
              {" · "}
              <Link
                href="/client-portal/login"
                className="text-zinc-400 hover:text-white"
              >
                Client portal
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

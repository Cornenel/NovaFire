"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Technician sign-in – Supabase Auth */

export default function TechLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Invalid email or password"
          : signInError.message
      );
      setLoading(false);
      return;
    }

    router.push("/tech");
    router.refresh();
  }

  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center py-20 px-6"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Flame className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
            Nova<span className="text-red-600">Fire</span> Tech
          </h1>
          <p className="text-zinc-500 text-sm mt-2">
            Sign in to access your jobs
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-zinc-400 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@novafire.co.za"
              required
              className="w-full px-4 py-3 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-500 focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-zinc-400 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              className="w-full px-4 py-3 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-500 focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg text-white font-semibold nf-btn-primary transition-[filter,box-shadow] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Staff accounts only. Contact your administrator for access.
        </p>
        <p className="text-center text-sm mt-4">
          <Link
            href="/client-portal/login"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            Customer? Sign in to the Client Portal →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";

/**
 * Tech portal login – @novafire.co.za email + staff password
 */

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

    try {
      const res = await fetch("/api/tech-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push("/tech");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
            Technician Portal
          </h1>
          <p className="text-zinc-500 text-sm mt-2">
            Sign in with your Nova Fire email
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Staff password"
              required
              className="w-full px-4 py-3 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-500 focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Only @novafire.co.za addresses
        </p>
      </motion.div>
    </div>
  );
}

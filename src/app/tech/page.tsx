"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ZohoFormEmbed } from "@/components/forms/zoho-form-embed";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ClipboardList,
  Cylinder,
  Truck,
  Wrench,
  Lock,
  LogOut,
} from "lucide-react";

/**
 * Technician Backend Dashboard
 * Clean admin UI, role-based auth ready, configurable submission endpoints.
 */

const TECH_FORMS = [
  { id: "jobcard", label: "Jobcard Submission", icon: ClipboardList },
  { id: "cylinder", label: "Cylinder Refill Log", icon: Cylinder },
  { id: "vehicle", label: "Vehicle Inspection Checklist", icon: Truck },
  { id: "equipment", label: "Equipment Replacement Request", icon: Wrench },
] as const;

export default function TechPortalPage() {
  const [isAuthenticated] = useState(false); // TODO: Replace with real auth
  const [activeForm, setActiveForm] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="flex flex-col items-center justify-center min-h-screen px-6">
          <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-4">
            Technician Portal
          </h1>
          <p className="text-zinc-400 text-center mb-8 max-w-sm">
            Sign in to submit jobcards, refill logs, and equipment requests.
          </p>
          <Button className="bg-red-600 hover:bg-red-500">Sign In (Placeholder)</Button>
          <Link href="/" className="mt-8 text-sm text-zinc-500 hover:text-white transition-colors">
            ← Back to Nova Fire
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-white/5 bg-[#0d0d0d]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
              Nova<span className="text-red-600">Fire</span>
            </span>
            <span className="text-xs font-mono text-zinc-500 px-2 py-1 rounded bg-white/5">
              TECH
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">Technician</span>
            <button className="p-2 text-zinc-500 hover:text-white transition-colors" aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-2">
            Technician Backend
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-syne)]">
            Forms & Logs
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">
            Submission endpoint: Configure via <code className="text-zinc-500 font-mono">NEXT_PUBLIC_TECH_API_URL</code>
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2">
          {TECH_FORMS.map((form) => (
            <motion.div
              key={form.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * TECH_FORMS.indexOf(form) }}
              className="rounded-xl border border-white/10 bg-[#0d0d0d] p-6 hover:border-red-500/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                  <form.icon className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white font-[family-name:var(--font-syne)]">
                    {form.label}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 border-white/10 text-zinc-400 hover:text-white hover:border-red-500/30"
                    onClick={() => setActiveForm(activeForm === form.id ? null : form.id)}
                  >
                    {activeForm === form.id ? "Hide Form" : "Show Form"}
                  </Button>
                  {activeForm === form.id && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      {/* ZOHO FORM EMBED HERE */}
                      <ZohoFormEmbed
                        formId={`tech-${form.id}`}
                        minHeight={220}
                        fallback={<p className="text-zinc-500 text-xs">Loading…</p>}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:text-white transition-colors">
            ← Back to Nova Fire
          </Link>
        </div>
      </main>
    </div>
  );
}

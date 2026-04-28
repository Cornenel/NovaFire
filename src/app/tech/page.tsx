"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ZohoFormEmbed } from "@/components/forms/zoho-form-embed";
import { LegalNav } from "@/components/site-footer";
import Link from "next/link";
import {
  ClipboardList,
  Cylinder,
  Truck,
  Wrench,
  LogOut,
  ChevronDown,
  ChevronUp,
  Activity,
  FileText,
  BarChart3,
} from "lucide-react";

/**
 * Technician Portal – firetech.novafire.co.za/tech
 * Jobcard, cylinder refill, vehicle inspection, equipment replacement
 */

const SECTIONS = [
  {
    id: "jobcard",
    label: "Jobcard Submission",
    icon: ClipboardList,
    desc: "Submit completed service jobcards. Client, site, work done, and sign-off.",
  },
  {
    id: "cylinder",
    label: "Cylinder Refill Log",
    icon: Cylinder,
    desc: "Log cylinder refills and recharges. Quantity, type, and batch details.",
  },
  {
    id: "vehicle",
    label: "Vehicle Inspection Checklist",
    icon: Truck,
    desc: "Daily or periodic vehicle inspection. Safety, equipment, and mileage.",
  },
  {
    id: "equipment",
    label: "Equipment Replacement Request",
    icon: Wrench,
    desc: "Request replacement of faulty or expired equipment.",
  },
] as const;

export default function TechPortalPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>("jobcard");

  return (
    <div className="min-h-screen nf-bg-base">
      {/* Header */}
      <header className="border-b border-white/[0.06] nf-bg-raised/95 backdrop-blur-xl sticky top-0 z-40 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
                Nova<span className="text-red-600">Fire</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                TECH
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-zinc-400">Technician Portal</span>
              <a
                href="/api/tech-logout"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-red-500" />
            <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em]">
              Technician Portal
            </p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-syne)]">
            Forms & Logs
          </h1>
          <p className="text-zinc-400 mt-2 text-sm max-w-xl">
            Submit jobcards, log cylinder refills, complete vehicle inspections, and request equipment replacements.
          </p>
        </motion.div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 mb-10">
          <a
            href="#finalized-jobs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5 hover:border-red-500/20 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Finalized Jobs
          </a>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5 hover:border-red-500/20 transition-colors"
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </a>
          ))}
        </div>

        {/* Form sections */}
        <div className="space-y-4">
          {SECTIONS.map((s, idx) => {
            const isExpanded = expandedSection === s.id;
            return (
              <motion.section
                key={s.id}
                id={s.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl border border-white/[0.08] nf-glass-panel overflow-hidden scroll-mt-24"
              >
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : s.id)}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                      <s.icon className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-white font-[family-name:var(--font-syne)]">
                        {s.label}
                      </h2>
                      <p className="text-sm text-zinc-500 mt-0.5 truncate">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-zinc-500">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/5"
                  >
                    <div className="p-6 pt-4">
                      {s.id === "jobcard" ? (
                        <div className="rounded-lg border border-white/[0.07] nf-bg-base p-6 flex flex-col items-center justify-center gap-4">
                          <p className="text-zinc-400 text-sm text-center">
                            Annual Service Job Card & Service Certificate
                          </p>
                          <a
                            href="https://forms.zohopublic.com/AbakhisaGroup/form/JobcardV2/formperma/bcoxipOvNeRw0CUmOm5y4eAKaev-8m0RLson7Q-0ckI"
                            title="Annual Service Job Card & Service Certificate"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              const w = 700;
                              const h = 648;
                              const left = typeof window !== "undefined" ? (window.screen.width - w) / 2 : 0;
                              const top = typeof window !== "undefined" ? (window.screen.height - h) / 2 : 0;
                              window.open(
                                (e.currentTarget as HTMLAnchorElement).href,
                                "_blank",
                                `width=${w},height=${h},left=${left},top=${top},toolbar=0,location=0,status=1,scrollbars=1,resizable=1`
                              );
                            }}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            Access Jobcard Form
                          </a>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-white/[0.07] nf-bg-base p-4 md:p-6">
                          <ZohoFormEmbed
                            formId={`tech-${s.id}`}
                            minHeight={400}
                            fallback={
                              <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <FileText className="w-12 h-12 text-zinc-600" />
                                <p className="text-zinc-500 text-sm">Form will load here</p>
                                <p className="text-xs text-zinc-600">
                                  Add Zoho form embed for {s.label}
                                </p>
                              </div>
                            }
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.section>
            );
          })}
        </div>

        {/* Finalized Jobs Report */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          id="finalized-jobs"
          className="mt-10 rounded-xl border border-white/[0.08] nf-glass-panel overflow-hidden scroll-mt-24"
        >
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="font-semibold text-white font-[family-name:var(--font-syne)]">
                  Finalized Jobs
                </h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  View and review completed jobcards
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="rounded-lg border border-white/[0.07] nf-bg-base p-6 flex flex-col items-center justify-center gap-4">
              <p className="text-zinc-400 text-sm text-center">
                Service History / New Updated Jobcard Report
              </p>
              <a
                href="https://forms.zohopublic.com/AbakhisaGroup/report/NewUpdatedJobcard/reportperma/Xc7eC19l5O_W6eny5aHJks1aEJLeVT69vo6prU7JBL8"
                title="Annual Service Job Card & Service Certificate"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  const w = 700;
                  const h = 648;
                  const left = typeof window !== "undefined" ? (window.screen.width - w) / 2 : 0;
                  const top = typeof window !== "undefined" ? (window.screen.height - h) / 2 : 0;
                  window.open(
                    (e.currentTarget as HTMLAnchorElement).href,
                    "_blank",
                    `width=${w},height=${h},left=${left},top=${top},toolbar=0,location=0,status=1,scrollbars=1,resizable=1`
                  );
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Access Service History Report
              </a>
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="https://novafire.co.za"
              className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
              ← Back to Nova Fire
            </Link>
            <p className="text-xs text-zinc-600 text-center sm:text-right">
              Submissions are logged and routed per your config
            </p>
          </div>
          <LegalNav className="justify-center" />
        </div>
      </main>
    </div>
  );
}

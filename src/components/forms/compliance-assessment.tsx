"use client";

import React from "react";
import { motion } from "framer-motion";
import { ZohoFormEmbed } from "./zoho-form-embed";
import { FormLegalNotice } from "@/components/form-legal-notice";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";

/**
 * Fire Compliance Self-Assessment
 *
 * ZOHO CRM INTEGRATION:
 * - Create CRM lead on submit
 * - Tag lead as "Website Compliance Lead"
 * - Redirect to /thank-you
 *
 * ZOHO FORM REQUIREMENTS (when configured):
 * - 6–8 questions with conditional logic
 * - Score calculation at the end
 * - Dynamic compliance percentage result
 * - CTA: "Book Professional Inspection"
 */

export function ComplianceAssessment() {
  return (
    <section
      id="compliance-assessment"
      className="py-32 nf-bg-raised border-y border-white/[0.06] scroll-mt-24 relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(220,38,38,0.06),transparent)]"
        aria-hidden
      />
      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="nf-eyebrow mb-4">Self-Assessment</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-syne)] mb-4">
            Is Your Business Fire Compliant?
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            Answer a few questions to get an instant compliance score and
            personalised recommendations.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl nf-glass-panel backdrop-blur-md overflow-hidden border-white/[0.08]"
          >
            <div className="p-6 sm:p-8 border-b border-white/5 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)]">
                  Compliance Check
                </h3>
                <p className="text-sm text-zinc-500">
                  2-minute check • Conditional logic • Score at end
                </p>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              {/* ZOHO FORM EMBED – Nova Fire 2 Minute Fire Compliance Check */}
              <ZohoFormEmbed
                formId="compliance-self-assessment"
                minHeight={500}
                fallback={
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                    <p className="text-zinc-500 text-sm">Loading assessment…</p>
                  </div>
                }
              >
                <iframe
                  aria-label="Nova Fire – 2 Minute Fire Compliance Check"
                  frameBorder="0"
                  className="w-full min-h-[500px] border-0"
                  src="https://forms.zohopublic.com/AbakhisaGroup/form/NovaFire2MinuteFireComplianceCheck/formperma/EWhSaaBOV0Rcq34Ly2tmxK_Q44T0y9qg0pakqjJuZ-M"
                  title="Nova Fire 2 Minute Fire Compliance Check"
                />
              </ZohoFormEmbed>
              <FormLegalNotice className="mt-6" />
              <div className="mt-6 pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <p className="text-xs text-zinc-500">
                  After submitting, you&apos;ll be redirected to book an inspection.
                </p>
                <Button
                  asChild
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold px-6"
                >
                  <Link href="/thank-you?source=compliance">
                    Book Professional Inspection
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { ComplianceCheckForm } from "@/components/forms/compliance-check-form";

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
                  2-minute check • Score at the end • Book an inspection
                </p>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <ComplianceCheckForm />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

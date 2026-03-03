"use client";

import React from "react";
import { motion } from "framer-motion";
import { EmberBackground } from "@/components/ember-background";
import { Navbar } from "@/components/navbar";
import { FormSection } from "@/components/forms";
import { ZohoFormEmbed } from "@/components/forms/zoho-form-embed";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Smart Quote Engine
 *
 * ZOHO CRM INTEGRATION:
 * - Create CRM opportunity on submit
 * - Notify admin email
 * - Redirect to /quote-confirmation
 *
 * CONDITIONAL LOGIC: Show/hide fields based on business type, thatch roof, etc.
 * COST ESTIMATE: Structure prepared for calculation (extinguisher count × type pricing)
 */

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden pt-24">
        <EmberBackground />
        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-4"
          >
            Request Quote
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-syne)]"
          >
            Smart Quote Engine
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400 mt-4 max-w-xl mx-auto"
          >
            Get a tailored fire protection quote. Fields adapt to your business type.
          </motion.p>
        </div>
      </section>

      <section className="py-20 bg-[#0d0d0d] border-y border-white/5">
        <div className="container mx-auto px-6 max-w-3xl">
          <FormSection
            title="Request a Quote"
            description="Select your business type and requirements. We’ll provide an estimated cost and follow up within 24 hours."
            label="Quote Form"
            maxWidth="full"
          >
            {/* ZOHO FORM EMBED HERE – Replace with Zoho Forms embed containing: */}
            {/* - Business type (Office/Warehouse/Lodge/Farm/Industrial) */}
            {/* - Number of extinguishers */}
            {/* - Extinguisher types (9kg DCP / 4.5kg DCP / CO2) */}
            {/* - Thatch roof? (Yes/No) – conditional on Lodge/Farm */}
            {/* - Fire blankets required? */}
            {/* - Floor plan upload */}
            {/* - Contact details */}
            <ZohoFormEmbed
              formId="quote-engine"
              minHeight={500}
              fallback={
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                  <p className="text-zinc-500 text-sm">Loading quote form…</p>
                </div>
              }
            />

            {/* Placeholder UI grouping for reference – mirrors Zoho form structure */}
            <div className="mt-8 space-y-6 text-sm text-zinc-500 border border-dashed border-white/10 rounded-lg p-6">
              <div>
                <p className="font-medium text-zinc-400 mb-1">Form field groups (for Zoho config):</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Business type: Office / Warehouse / Lodge / Farm / Industrial</li>
                  <li>Number of extinguishers</li>
                  <li>Extinguisher types: 9kg DCP / 4.5kg DCP / CO2</li>
                  <li>Thatch roof? (Yes/No) – show if Lodge or Farm</li>
                  <li>Fire blankets required?</li>
                  <li>Floor plan upload</li>
                  <li>Contact details</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-zinc-400 mb-1">On submit:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Create CRM opportunity</li>
                  <li>Notify admin email</li>
                  <li>Redirect to /quote-confirmation</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button asChild className="bg-red-600 hover:bg-red-500">
                <Link href="/quote-confirmation">
                  Submit Quote Request
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </FormSection>
        </div>
      </section>

      <footer className="bg-[#0a0a0a] border-t border-white/5 py-12">
        <div className="container mx-auto px-6 text-center text-zinc-500 text-sm">
          <Link href="/" className="text-red-500 hover:text-red-400 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}

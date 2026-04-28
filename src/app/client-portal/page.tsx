"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { FormSection } from "@/components/forms";
import { ZohoFormEmbed } from "@/components/forms/zoho-form-embed";
import { Button } from "@/components/ui/button";
import { FormLegalNotice } from "@/components/form-legal-notice";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * Client Portal – Protected section (placeholder auth ready)
 *
 * AUTH: Placeholder – integrate your auth provider (e.g. NextAuth, Clerk, custom).
 * When unauthenticated, show login gate or redirect to /login.
 */

export default function ClientPortalPage() {
  const [isAuthenticated] = useState(false); // TODO: Replace with real auth check

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen nf-bg-base flex flex-col">
        <Navbar />
        <section className="pt-32 pb-20 px-6 flex-1">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-4">
              Client Portal
            </h1>
            <p className="text-zinc-400 mb-8">
              Sign in to access emergency call-out, payment uploads, and asset updates.
            </p>
            <Button asChild className="bg-red-600 hover:bg-red-500">
              <Link href="/">Sign In (Placeholder)</Link>
            </Button>
            <p className="text-xs text-zinc-500 mt-6">
              Auth integration: Add your provider in layout/middleware.
            </p>
          </div>
        </section>
        <SiteFooter variant="compact" />
      </div>
    );
  }

  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <Navbar />
      <section className="pt-32 pb-20 px-6 flex-1">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-2">
              Client Portal
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-syne)]">
              Client Forms
            </h1>
            <p className="text-zinc-400 mt-2">
              Emergency call-outs, payment uploads, and asset updates.
            </p>
          </motion.div>

          <FormLegalNotice className="mb-10 max-w-2xl mx-auto text-center" />

          <div className="space-y-12">
            {/* A) Emergency Call-Out Form */}
            <FormSection
              id="emergency-callout"
              title="Emergency Call-Out"
              description="Report a fire emergency. SLA clients receive priority response."
              label="Form A"
              variant="card"
            >
              {/* ZOHO FORM EMBED HERE – Webhook endpoint on submit */}
              <ZohoFormEmbed
                formId="emergency-callout"
                minHeight={380}
                fallback={<p className="text-zinc-500 text-sm">Loading form…</p>}
              />
              <div className="mt-4 text-xs text-zinc-500 space-y-1">
                <p>Fields: SLA client checkbox, Nature of emergency, Upload photo, Location, Contact person</p>
                <p>On submit: Trigger webhook endpoint (placeholder) → Notify ops team</p>
              </div>
            </FormSection>

            {/* B) Payment POP Upload Form */}
            <FormSection
              id="payment-pop"
              title="Payment POP Upload"
              description="Submit proof of payment for an invoice."
              label="Form B"
              variant="card"
            >
              {/* ZOHO FORM EMBED HERE – Auto email notification to admin */}
              <ZohoFormEmbed
                formId="payment-pop"
                minHeight={280}
                fallback={<p className="text-zinc-500 text-sm">Loading form…</p>}
              />
              <div className="mt-4 text-xs text-zinc-500 space-y-1">
                <p>Fields: Invoice number, Upload POP</p>
                <p>On submit: Auto email notification to admin</p>
              </div>
            </FormSection>

            {/* C) Asset Update Form */}
            <FormSection
              id="asset-update"
              title="Asset Update"
              description="Add or remove extinguishers and update asset records."
              label="Form C"
              variant="card"
            >
              {/* ZOHO FORM EMBED HERE */}
              <ZohoFormEmbed
                formId="asset-update"
                minHeight={320}
                fallback={<p className="text-zinc-500 text-sm">Loading form…</p>}
              />
              <div className="mt-4 text-xs text-zinc-500 space-y-1">
                <p>Fields: Add/remove extinguisher, Upload images, Notes</p>
                <p>On submit: Sync with asset register (Zoho CRM / custom)</p>
              </div>
            </FormSection>
          </div>

        </div>
      </section>
      <SiteFooter variant="compact" />
    </div>
  );
}

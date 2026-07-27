"use client";

import React from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { EmberBackground } from "@/components/ember-background";
import { FormSection } from "@/components/forms";
import { TrainingRegistrationForm } from "@/components/forms/training-registration-form";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

/**
 * Fire Safety Training Registration
 *
 * ZOHO CRM INTEGRATION:
 * - Create CRM lead on submit
 * - Trigger email confirmation to attendee
 * - Structure ready for certificate automation (post-training)
 */

export default function TrainingPage() {
  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <Navbar />
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden pt-24">
        <EmberBackground />
        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-6"
          >
            <GraduationCap className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-red-500">Fire Safety Training</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-syne)]"
          >
            Training Registration
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400 mt-4 max-w-xl mx-auto"
          >
            Book your company&apos;s fire safety training. Hands-on extinguisher use and
            evacuation drills.
          </motion.p>
        </div>
      </section>

      <section className="py-20 nf-bg-raised border-y border-white/[0.06]">
        <div className="container mx-auto px-6 max-w-2xl">
          <FormSection
            title="Register for Training"
            description="Complete the form below. We’ll confirm your booking and send preparation details."
            label="Fire Safety Training"
            maxWidth="full"
          >
            <TrainingRegistrationForm />
          </FormSection>
        </div>
      </section>

      <SiteFooter variant="compact" />
    </div>
  );
}

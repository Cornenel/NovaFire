"use client";

import React from "react";
import { motion } from "framer-motion";
import { EmberBackground } from "@/components/ember-background";
import { Navbar } from "@/components/navbar";
import { FormSection } from "@/components/forms";
import { ZohoFormEmbed } from "@/components/forms/zoho-form-embed";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  Package,
  Flame,
  Shield,
  FileCheck,
  ClipboardList,
  Building2,
  Wrench,
} from "lucide-react";

const SERVICES = [
  {
    icon: Package,
    title: "Installations & Supply",
    desc: "SABS-approved extinguishers, hose reels, suppression systems, and fire blankets—supplied and professionally installed. Full site surveys and equipment specification.",
  },
  {
    icon: Wrench,
    title: "Servicing of Fixed & Portable Fire Equipment",
    desc: "Certified maintenance and inspection of portable extinguishers, hose reels, suppression systems, and fixed installations. SANS 1475 compliant servicing schedules.",
  },
  {
    icon: ClipboardList,
    title: "Site-Specific SLAs",
    desc: "Tailored Service Level Agreements for your facility. Priority response times, scheduled maintenance, compliance reporting, and dedicated account management.",
  },
  {
    icon: Shield,
    title: "Insurance VAPs",
    desc: "Insurance-mandated Value Added Programmes and fire risk assessments. Satisfy insurer requirements and optimise premiums with documented compliance.",
  },
  {
    icon: Flame,
    title: "Detection System Support",
    desc: "Installation, testing, and monitoring of fire detection and alarm systems. Integration with suppression and evacuation systems.",
  },
  {
    icon: FileCheck,
    title: "Compliance Management",
    desc: "End-to-end compliance tracking and SANS-aligned certification. Audit-ready documentation, renewal reminders, and gap analysis.",
  },
  {
    icon: Building2,
    title: "Fire Risk Assessments",
    desc: "Comprehensive site audits and risk mitigation strategies. Identify hazards and implement controls for lodges, warehouses, and industrial sites.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden pt-24">
        <EmberBackground />
        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-4"
          >
            What We Deliver
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-syne)]"
          >
            Our Services
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400 mt-6 max-w-2xl mx-auto text-lg"
          >
            Fire protection, compliance, and safety solutions tailored to your site.
          </motion.p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-[#0d0d0d] border-y border-white/5">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {SERVICES.map((s, idx) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                className="group relative p-8 rounded-xl border border-white/5 bg-[#0a0a0a]/80 backdrop-blur-sm hover:border-red-900/40 hover:bg-[#111]/90 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative mb-6">
                  <s.icon className="w-11 h-11 text-red-500/90" strokeWidth={1.5} />
                </div>
                <h3 className="relative text-xl font-semibold text-white mb-3 font-[family-name:var(--font-syne)]">
                  {s.title}
                </h3>
                <p className="relative text-zinc-400 text-sm leading-relaxed">
                  {s.desc}
                </p>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Request Quote Section */}
      <section id="request-quote" className="py-24 bg-[#0a0a0a] scroll-mt-24">
        <div className="container mx-auto px-6 max-w-3xl">
          <FormSection
            title="Request a Quote"
            description="Select your business type and requirements. We'll provide an estimated cost and follow up within 24 hours."
            label="Quote Form"
            maxWidth="full"
          >
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

            <div className="mt-8 space-y-6 text-sm text-zinc-500 border border-dashed border-white/10 rounded-lg p-6">
              <p className="font-medium text-zinc-400">
                Form fields: Business type, extinguisher count & types, thatch roof, fire blankets,
                floor plan upload, contact details.
              </p>
              <p className="text-xs">
                On submit: Create CRM opportunity, notify admin, redirect to confirmation.
              </p>
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

      {/* CTA */}
      <section className="py-16 bg-[#0d0d0d] border-t border-white/5">
        <div className="container mx-auto px-6 text-center">
          <p className="text-zinc-400 mb-6">Need a custom solution or SLA?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild className="bg-red-600 hover:bg-red-500">
              <Link href="/#contact">Contact Us</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 text-zinc-400 hover:text-white">
              <Link href="/">← Back to Home</Link>
            </Button>
          </div>
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

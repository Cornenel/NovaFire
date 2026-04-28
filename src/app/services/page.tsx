"use client";

import React from "react";
import { motion } from "framer-motion";
import { EmberBackground } from "@/components/ember-background";
import { Navbar } from "@/components/navbar";
import { ZohoFormEmbed } from "@/components/forms/zoho-form-embed";
import { FormLegalNotice } from "@/components/form-legal-notice";
import { SiteFooter } from "@/components/site-footer";
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

const CORE_SERVICES = [
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
];

const ADDITIONAL_SERVICES = [
  {
    icon: Flame,
    title: "Detection System Support",
    desc: "Installation, testing, and monitoring of fire detection and alarm systems.",
  },
  {
    icon: FileCheck,
    title: "Compliance Management",
    desc: "End-to-end compliance tracking, SANS certification, and audit-ready documentation.",
  },
  {
    icon: Building2,
    title: "Fire Risk Assessments",
    desc: "Site audits and risk mitigation for lodges, warehouses, and industrial sites.",
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
    <div className="min-h-screen nf-bg-base flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[45vh] flex items-center justify-center overflow-hidden pt-24 pb-16">
        <EmberBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--nf-void)]/90" />
        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-4"
          >
            What We Deliver
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-[family-name:var(--font-syne)] tracking-tight"
          >
            Our Services
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.16 }}
            className="text-zinc-400 mt-5 max-w-xl mx-auto text-base md:text-lg"
          >
            Fire protection, compliance, and safety solutions tailored to your site.
          </motion.p>
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-6 border-y border-white/[0.06] nf-bg-raised">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-xs font-mono text-zinc-500 tracking-widest">
            {["SANS 1475", "SAQCC", "ISO 9001", "BSI Permit Holder"].map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Core services – 2x2 grid */}
      <section className="py-20 md:py-28 nf-bg-base">
        <div className="container mx-auto px-6 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em] mb-3">
              Core Services
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-syne)]">
              End-to-end fire protection
            </h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="grid sm:grid-cols-2 gap-6 lg:gap-8"
          >
            {CORE_SERVICES.map((s) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                className="group relative p-8 md:p-10 rounded-2xl border border-white/[0.07] nf-glass-panel nf-card-hover overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex gap-6">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <s.icon className="w-7 h-7 text-red-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                      {s.title}
                    </h3>
                    <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Additional services – 3-col compact */}
      <section className="py-16 md:py-24 nf-bg-raised border-y border-white/[0.06]">
        <div className="container mx-auto px-6 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em] mb-3">
              Additional Services
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-syne)]">
              Support & compliance
            </h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6"
          >
            {ADDITIONAL_SERVICES.map((s) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                className="group p-6 rounded-xl border border-white/[0.07] nf-glass-panel nf-card-hover"
              >
                <s.icon className="w-10 h-10 text-red-500/90 mb-4" strokeWidth={1.5} />
                <h3 className="text-base font-semibold text-white font-[family-name:var(--font-syne)] mb-2">
                  {s.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quote section – two-column layout */}
      <section
        id="request-quote"
        className="relative py-20 md:py-28 nf-bg-base scroll-mt-24"
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(220, 38, 38, 0.08) 0%, transparent 70%)",
          }}
        />
        <div className="container mx-auto px-6 max-w-5xl relative">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-2 space-y-6">
              <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em]">
                Get a Quote
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-syne)] leading-tight">
                Request a tailored quote
              </h2>
              <p className="text-zinc-400 leading-relaxed">
                Tell us your business type, extinguisher needs, and site details.
                We&apos;ll provide an estimated cost and follow up within 24 hours.
              </p>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                  Office, warehouse, lodge, farm, industrial
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                  Extinguisher types & quantities
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                  Optional floor plan upload
                </li>
              </ul>
            </div>
            <div className="lg:col-span-3">
              <div className="rounded-2xl nf-glass-panel p-6 md:p-8 border-white/[0.08]">
                {/* ZOHO FORM EMBED – Nova Fire Compliance Assessment / Quote Form */}
                <ZohoFormEmbed
                  formId="quote-engine"
                  minHeight={500}
                  scriptSrc={process.env.NEXT_PUBLIC_ZOHO_FORM_QUOTE_SCRIPT_SRC}
                  fallback={
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <div className="w-10 h-10 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                      <p className="text-zinc-500 text-sm">Loading form…</p>
                    </div>
                  }
                >
                  <iframe
                    aria-label="Nova Fire Compliance Assessment Form"
                    frameBorder="0"
                    className="w-full min-h-[500px] border-0"
                    src="https://forms.zohopublic.com/AbakhisaGroup/form/NovaFireComplianceAssessmentForm/formperma/e21SwYu48K_cyg4hGor_mkLWhemphA-JE5hbx9qAYxE?zf_rszfm=1"
                    title="Nova Fire Quote & Compliance Assessment"
                  />
                </ZohoFormEmbed>
                <FormLegalNotice className="mt-6" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 nf-bg-raised border-t border-white/[0.06]">
        <div className="container mx-auto px-6 text-center">
          <p className="text-zinc-400 mb-6">Need a custom solution or site-specific SLA?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild className="bg-red-600 hover:bg-red-500">
              <Link href="/#contact">Contact Us</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 text-zinc-400 hover:text-white">
              <Link href="/">
                <ArrowRight className="w-4 h-4 rotate-180 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter variant="compact" />
    </div>
  );
}

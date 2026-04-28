"use client";

import React from "react";
import { motion } from "framer-motion";
import { EmberBackground } from "@/components/ember-background";
import { Navbar } from "@/components/navbar";
import { ZohoFormEmbed } from "@/components/forms/zoho-form-embed";
import { FormLegalNotice } from "@/components/form-legal-notice";
import { SiteFooter } from "@/components/site-footer";
import { ServiceAreaStructuredData } from "@/components/structured-data";
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

const SERVICE_LINKS = [
  {
    href: "/services/fire-extinguisher-servicing",
    title: "Fire extinguisher servicing",
    desc: "Portable extinguisher inspections, maintenance and compliance documentation.",
  },
  {
    href: "/services/fire-hose-reel-servicing",
    title: "Fire hose reel servicing",
    desc: "Fixed hose reel inspections, testing, maintenance and reporting.",
  },
  {
    href: "/services/fire-hydrant-supply-installation",
    title: "Fire hydrant supply & installation",
    desc: "Site scoping, equipment specification, supply and installation support.",
  },
];

const CORE_SERVICES = [
  {
    icon: Package,
    title: "Installations & Supply",
    desc: "SABS-approved fire extinguishers, hose reels, and fire hydrants—plus suppression systems and fire blankets—supplied and professionally installed. Full site surveys and equipment specification.",
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
  const faqItems = [
    {
      q: "Do you service portable and fixed fire equipment?",
      a: "Yes. We service portable extinguishers and fixed installations such as hose reels and suppression systems, with scheduled inspections and compliant documentation.",
    },
    {
      q: "Do you service fire detection and alarm systems?",
      a: "Yes. We provide testing and servicing for fire detection and alarm systems, including fault finding and reporting to keep your system reliable and compliant.",
    },
    {
      q: "Can you supply and install fire equipment?",
      a: "Yes. We supply and install portable and fixed fire equipment based on your site requirements—typically extinguishers, hose reels, hydrants, and suppression systems—with professional installation and follow-up servicing schedules.",
    },
    {
      q: "Which areas do you cover?",
      a: "We provide on-site services across Mpumalanga and Limpopo provinces.",
    },
  ];

  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <ServiceAreaStructuredData
        name="Fire equipment servicing, detection servicing, supply & installation"
        url="https://novafire.co.za/services"
        areas={["Mpumalanga", "Limpopo"]}
        services={[
          "Portable fire equipment servicing",
          "Fixed fire equipment servicing",
          "Fire detection and alarm servicing",
          "Fire extinguisher supply and installation",
          "Fire hose reel supply and installation",
          "Fire hydrant supply and installation",
        ]}
      />
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
            Portable and fixed fire equipment servicing, fire detection servicing, and supply &
            installation across <span className="text-zinc-200">Mpumalanga</span> and{" "}
            <span className="text-zinc-200">Limpopo</span>.
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

      {/* Quick links for common services (SEO + UX) */}
      <section className="py-14 nf-bg-base">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-8">
            <div>
              <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em] mb-3">
                Popular Services
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-syne)]">
                Extinguishers, hose reels & hydrants
              </h2>
            </div>
            <Link
              href="/services#request-quote"
              className="text-sm text-zinc-400 hover:text-white underline-offset-4 hover:underline"
            >
              Request a quote
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {SERVICE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group rounded-2xl border border-white/[0.07] nf-glass-panel p-7 nf-card-hover"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white font-[family-name:var(--font-syne)]">
                    {l.title}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-red-400 transition-colors" />
                </div>
                <p className="mt-3 text-sm text-zinc-500 leading-relaxed">{l.desc}</p>
                <p className="mt-4 text-xs font-mono text-zinc-500 uppercase tracking-[0.18em]">
                  Mpumalanga • Limpopo
                </p>
              </Link>
            ))}
          </div>
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

      {/* Areas served + keyword support */}
      <section className="py-16 md:py-20 nf-bg-base">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em] mb-3">
              Areas We Serve
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-syne)]">
              Mpumalanga & Limpopo
            </h2>
            <p className="text-zinc-400 mt-4 leading-relaxed">
              We support lodges, estates, farms, warehouses, and commercial facilities with on-site
              servicing and compliant installations.
            </p>
            <div className="mt-6">
              <Link
                href="/areas"
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white underline-offset-4 hover:underline"
              >
                View service areas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="mt-10 grid md:grid-cols-2 gap-6 auto-rows-fr">
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7 h-full">
              <h3 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Mpumalanga
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Servicing and compliance support for sites across the province, including industrial,
                hospitality, and agricultural operations.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7 h-full">
              <h3 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Limpopo
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                On-site servicing and installations for lodges, estates, warehouses, and commercial
                facilities throughout Limpopo.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7 h-full">
              <h3 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                What “servicing” includes
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Scheduled inspections, testing, maintenance, replacement where required, and
                documentation aligned with SANS requirements—so your site stays audit-ready.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7 h-full">
              <h3 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Popular search terms we cover
              </h3>
              <ul className="text-sm text-zinc-500 space-y-1">
                <li>Portable fire extinguisher servicing</li>
                <li>Fire hose reel servicing</li>
                <li>Fire hydrant servicing</li>
                <li>Fire detection and alarm servicing</li>
                <li>Fire extinguisher supply & installation</li>
                <li>Fire hose reel supply & installation</li>
                <li>Fire hydrant supply & installation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ – high-intent queries */}
      <section className="py-16 md:py-20 nf-bg-raised border-y border-white/[0.06]">
        <div className="container mx-auto px-6 max-w-4xl">
          <script
            type="application/ld+json"
            // JSON-LD: FAQPage + services + service area. Keep it concise and accurate.
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faqItems.map((it) => ({
                  "@type": "Question",
                  name: it.q,
                  acceptedAnswer: { "@type": "Answer", text: it.a },
                })),
              }),
            }}
          />
          <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em] mb-3 text-center">
            FAQ
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-syne)] text-center">
            Fire equipment servicing in Mpumalanga & Limpopo
          </h2>
          <div className="mt-10 space-y-4">
            {faqItems.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-white/[0.07] nf-glass-panel p-6"
              >
                <h3 className="text-base font-semibold text-white mb-2">
                  {item.q}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild className="bg-red-600 hover:bg-red-500">
              <Link href="/services#request-quote">
                Request a Quote <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
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
                    src="https://forms.zohopublic.com/AbakhisaGroup/form/NovaFireComplianceAssessmentForm/formperma/e21SwYu48K_cyg4hGor_mkLWhemphA-JE5hbx9qAYxE"
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

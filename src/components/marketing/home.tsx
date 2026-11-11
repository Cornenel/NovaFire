"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Factory,
  Flame,
  GraduationCap,
  MapPin,
  Phone,
  School,
  ShieldCheck,
  Trees,
  Wrench,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import {
  MarketingContainer,
  MarketingCta,
  MarketingPanel,
  SectionHeading,
} from "@/components/marketing/primitives";
import { EquipmentDemo } from "@/components/marketing/equipment-demo";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { MarketingSmoothScroll } from "@/components/marketing/smooth-scroll";

const CORE_SERVICES = [
  {
    icon: Flame,
    title: "Extinguisher servicing & supply",
    desc: "Portable and wheeled extinguisher inspection, servicing, supply and replacement with documented service history.",
    href: "/services/fire-extinguisher-servicing",
  },
  {
    icon: Wrench,
    title: "Hose reels & hydrants",
    desc: "Fixed hose reel servicing plus hydrant supply, installation and inspection support for commercial sites.",
    href: "/services/fire-hose-reel-servicing",
  },
  {
    icon: ClipboardCheck,
    title: "Registers, reports & certificates",
    desc: "Equipment registers, service reports and technical documentation for audits, insurers and site management.",
    href: "/compliance",
  },
  {
    icon: ShieldCheck,
    title: "Risk assessments & planning",
    desc: "Fire risk assessments, signage placement, evacuation planning and related corrective follow-up within authorised scope.",
    href: "/services",
  },
] as const;

const INDUSTRIES = [
  { icon: Trees, title: "Lodges & hospitality", href: "/industries#lodges" },
  { icon: Building2, title: "Estates & commercial", href: "/industries#estates" },
  { icon: Factory, title: "Industrial & agriculture", href: "/industries#industrial" },
  { icon: School, title: "Schools & institutions", href: "/industries#schools" },
] as const;

const PROCESS = [
  {
    step: "01",
    title: "Scope the site",
    desc: "Clarify equipment, access, compliance needs and commercial requirements before work starts.",
  },
  {
    step: "02",
    title: "Service & document",
    desc: "Technicians complete the agreed work package and capture evidence against the site equipment.",
  },
  {
    step: "03",
    title: "Review & release",
    desc: "Office review confirms findings, usage and documentation before records are released to the client.",
  },
  {
    step: "04",
    title: "Maintain the cycle",
    desc: "Scheduled maintenance keeps due dates visible and supports ongoing service agreements.",
  },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export default function MarketingHome() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  return (
    <div className="nf-obsidian relative min-h-screen overflow-x-hidden text-zinc-50">
      <div className="nf-noise pointer-events-none absolute inset-0" aria-hidden />
      <MarketingSmoothScroll />
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative min-h-[92vh] pt-24 pb-16">
          <div className="absolute inset-0" aria-hidden>
            <Image
              src="/quiet-ground/hero-lodge.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[center_35%] opacity-70 sm:opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/35 via-[#0a0a0a]/55 to-[#0a0a0a]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/70 via-[#0a0a0a]/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
          </div>

          <MarketingContainer className="relative z-10 flex min-h-[70vh] flex-col justify-end pb-8 md:justify-center md:pb-0">
            <motion.div
              initial={initial}
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: reduceMotion ? 0 : 0.08 },
                },
              }}
              className="max-w-3xl"
            >
              <motion.p variants={fadeUp} className="nf-eyebrow mb-5 text-red-400/80">
                Fire protection · Servicing · Compliance
              </motion.p>
              <motion.h1
                variants={fadeUp}
                className="font-[family-name:var(--font-syne)] text-4xl font-bold tracking-tight text-balance text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)] sm:text-5xl md:text-6xl md:leading-[1.05]"
              >
                Fire protection that keeps South African sites operational.
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-xl text-lg leading-8 text-zinc-200"
              >
                Nova Fire services, supplies and documents fire equipment for lodges, estates,
                commercial and industrial facilities across Mpumalanga and Limpopo.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-3">
                <MarketingCta href="/services#quote">
                  Request a quote
                  <ArrowRight className="h-4 w-4" />
                </MarketingCta>
                <MarketingCta href="tel:+27662700293" variant="secondary">
                  <Phone className="h-4 w-4" />
                  066 270 0293
                </MarketingCta>
              </motion.div>
            </motion.div>
          </MarketingContainer>
        </section>

        {/* Services */}
        <section id="services" className="nf-section border-t border-white/[0.06]">
          <MarketingContainer>
            <ScrollReveal>
              <SectionHeading
                eyebrow="Core services"
                title="Practical fire protection for real operating sites"
                description="From portable extinguishers to fixed installations, documentation and scheduled maintenance — scoped to what your facility actually needs."
              />
            </ScrollReveal>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {CORE_SERVICES.map(({ icon: Icon, title, desc, href }) => (
                <ScrollReveal key={title}>
                  <Link href={href} className="group">
                    <MarketingPanel className="h-full transition-colors group-hover:border-red-500/30 group-hover:bg-white/[0.04]">
                      <Icon className="mb-4 h-5 w-5 text-red-500" aria-hidden />
                      <h3 className="font-[family-name:var(--font-syne)] text-xl font-semibold text-zinc-50">
                        {title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">{desc}</p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-red-400">
                        Learn more <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </MarketingPanel>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
            <div className="mt-8">
              <MarketingCta href="/services" variant="ghost">
                View full services catalogue
                <ArrowRight className="h-4 w-4" />
              </MarketingCta>
            </div>
          </MarketingContainer>
        </section>

        <section className="border-t border-white/[0.06] bg-[#0f0f0f] py-16 md:py-20">
          <MarketingContainer>
            <ScrollReveal>
              <EquipmentDemo />
            </ScrollReveal>
          </MarketingContainer>
        </section>

        {/* Standards */}
        <section className="border-t border-white/[0.06] bg-[#0f0f0f] py-16 md:py-20">
          <MarketingContainer>
            <div className="grid items-start gap-10 md:grid-cols-[1.1fr_0.9fr]">
              <SectionHeading
                eyebrow="Standards & documentation"
                title="Clear records. Responsible claims."
                description="We align servicing practice with applicable South African standards and produce the documentation site managers, insurers and auditors ask for. Specific accreditation marks are only published when independently verified."
              />
              <MarketingPanel>
                <ul className="space-y-4 text-sm leading-6 text-zinc-300">
                  <li className="border-b border-white/[0.06] pb-4">
                    SANS-aligned portable and fixed equipment servicing procedures
                  </li>
                  <li className="border-b border-white/[0.06] pb-4">
                    Service certificates, inspection reports and equipment registers
                  </li>
                  <li className="border-b border-white/[0.06] pb-4">
                    Distinction between routine servicing and corrective / pressure-test work
                  </li>
                  <li>Client portal access for authorised site records where enabled</li>
                </ul>
                <MarketingCta href="/compliance" variant="secondary" className="mt-6">
                  Read compliance overview
                </MarketingCta>
              </MarketingPanel>
            </div>
          </MarketingContainer>
        </section>

        {/* Industries */}
        <section id="industries" className="nf-section border-t border-white/[0.06]">
          <MarketingContainer>
            <SectionHeading
              eyebrow="Industries"
              title="Built for the sites that define our region"
              description="Hospitality, estates, schools, industrial and agricultural operations — each with different access, risk and documentation needs."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {INDUSTRIES.map(({ icon: Icon, title, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-red-500/30 hover:bg-white/[0.04]"
                >
                  <Icon className="mb-3 h-5 w-5 text-red-500" aria-hidden />
                  <h3 className="font-semibold text-zinc-100">{title}</h3>
                </Link>
              ))}
            </div>
          </MarketingContainer>
        </section>

        {/* Process */}
        <section className="nf-section border-t border-white/[0.06] bg-[#0f0f0f]">
          <MarketingContainer>
            <SectionHeading
              eyebrow="How we work"
              title="A clear service process from enquiry to release"
            />
            <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {PROCESS.map(({ step, title, desc }) => (
                <li key={step} className="relative">
                  <p className="font-mono text-xs tracking-[0.2em] text-red-500/80">{step}</p>
                  <h3 className="mt-3 font-[family-name:var(--font-syne)] text-xl font-semibold">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{desc}</p>
                </li>
              ))}
            </ol>
          </MarketingContainer>
        </section>

        {/* Coverage + digital */}
        <section className="nf-section border-t border-white/[0.06]">
          <MarketingContainer className="grid gap-8 lg:grid-cols-2">
            <MarketingPanel className="nf-grid-lines">
              <MapPin className="mb-4 h-5 w-5 text-red-500" aria-hidden />
              <h3 className="font-[family-name:var(--font-syne)] text-2xl font-semibold">
                Mpumalanga &amp; Limpopo coverage
              </h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Local focus for lodges, estates, commercial facilities, schools, industrial sites
                and agricultural operations across our primary service provinces.
              </p>
              <MarketingCta href="/areas" variant="ghost" className="mt-6">
                View service areas
                <ArrowRight className="h-4 w-4" />
              </MarketingCta>
            </MarketingPanel>
            <MarketingPanel>
              <GraduationCap className="mb-4 h-5 w-5 text-red-500" aria-hidden />
              <h3 className="font-[family-name:var(--font-syne)] text-2xl font-semibold">
                Digital customer experience
              </h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                <strong className="font-medium text-zinc-200">Available now:</strong> client portal
                login for authorised site records, service requests, and released documentation where
                your account is enabled. Staff and technician apps support scheduled work and field
                capture.
              </p>
              <p className="mt-3 text-sm leading-7 text-zinc-500">
                Broader self-serve analytics and automated reminders continue to expand; ask your
                account contact what is active for your sites.
              </p>
              <MarketingCta href="/client-portal/login" variant="secondary" className="mt-6">
                Client portal
              </MarketingCta>
            </MarketingPanel>
          </MarketingContainer>
        </section>

        {/* Final CTA */}
        <section className="border-t border-white/[0.06] bg-gradient-to-b from-[#141414] to-[#0a0a0a] py-20 md:py-28">
          <MarketingContainer className="text-center">
            <SectionHeading
              align="center"
              eyebrow="Next step"
              title="Request a quotation for your site"
              description="Tell us about your facility, equipment and timing. We will respond with a scoped proposal — not a generic template."
              className="mx-auto"
            />
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <MarketingCta href="/services#quote">
                Request a quote
                <ArrowRight className="h-4 w-4" />
              </MarketingCta>
              <MarketingCta href="/contact" variant="secondary">
                Contact the office
              </MarketingCta>
            </div>
          </MarketingContainer>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

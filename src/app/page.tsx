"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Shield,
  Flame,
  FileCheck,
  AlertTriangle,
  GraduationCap,
  Building2,
  Factory,
  TreePine,
  UtensilsCrossed,
  ArrowRight,
  CheckCircle2,
  Activity,
  Quote,
  Package,
} from "lucide-react";
import { EmberBackground } from "@/components/ember-background";
import { Navbar } from "@/components/navbar";
import { Marquee } from "@/components/marquee";
import { ScrollProgress } from "@/components/scroll-progress";
import { AnimatedStat } from "@/components/animated-stat";
import { SectionDivider } from "@/components/section-divider";
import { ComplianceAssessment } from "@/components/forms/compliance-assessment";
import { SiteFooter } from "@/components/site-footer";

const SERVICES = [
  {
    icon: Package,
    title: "Fire Equipment Supply & Installation",
    desc: "SABS-approved extinguishers, hose reels, and suppression systems—supplied and professionally installed.",
  },
  {
    icon: Flame,
    title: "Fire Equipment Servicing",
    desc: "Certified maintenance and inspection of extinguishers, hose reels, and suppression systems.",
  },
  {
    icon: Shield,
    title: "Detection System Support",
    desc: "Installation, testing, and monitoring of fire detection and alarm systems.",
  },
  {
    icon: FileCheck,
    title: "Compliance Management",
    desc: "End-to-end compliance tracking and certification aligned with SANS standards.",
  },
  {
    icon: AlertTriangle,
    title: "Fire Risk Assessments",
    desc: "Comprehensive site audits and risk mitigation strategies.",
  },
  {
    icon: GraduationCap,
    title: "Staff Fire Training",
    desc: "Hands-on extinguisher use and evacuation drill programs.",
  },
];

const INDUSTRIES = [
  { icon: UtensilsCrossed, title: "Hospitality & Lodges" },
  { icon: Building2, title: "Commercial Property" },
  { icon: Factory, title: "Industrial Sites" },
  { icon: TreePine, title: "Estates & Complexes" },
];

const PROCESS_STEPS = [
  { step: "Assess", desc: "Site survey and compliance gap analysis" },
  { step: "Service", desc: "On-site maintenance by certified technicians" },
  { step: "Certify", desc: "Documentation and SANS-aligned certification" },
  { step: "Maintain", desc: "Scheduled upkeep and compliance tracking" },
];

const TRUST_ITEMS = [
  "SANS 1475",
  "SAQCC",
  "ISO 9001",
  "Lodges",
  "Estates",
  "Commercial",
  "Industrial",
  "Hospitality",
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export default function HomePage() {
  return (
    <div className="min-h-screen nf-bg-base">
      <ScrollProgress />
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Optional hero video layer (place file at /public/hero.mp4) */}
        <div className="absolute inset-0 z-0 pointer-events-none hidden sm:block">
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-[0.22]"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src="/hero.mp4" type="video/mp4" />
          </video>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 110% 80% at 50% 10%, rgba(220,38,38,0.22) 0%, transparent 55%), linear-gradient(to bottom, rgba(4,4,6,0.25), rgba(4,4,6,0.85))",
            }}
          />
        </div>
        <EmberBackground />
        <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none hidden sm:flex">
          <motion.div
            className="w-[800px] h-[500px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, rgba(220,38,38,0.4) 0%, transparent 70%)",
              filter: "blur(100px)",
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.15, 0.3, 0.15],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-4xl mx-auto"
          >
            <motion.div
              variants={fadeUp}
              className="mx-auto mb-8 flex items-center justify-center"
            >
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-white/[0.08] nf-glass-panel shadow-[0_0_60px_rgba(220,38,38,0.12)]">
                <Image
                  src="/brand/logo.png"
                  alt="Nova Fire"
                  fill
                  sizes="(max-width: 640px) 96px, 112px"
                  className="p-4 object-contain"
                  priority
                />
              </div>
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="nf-eyebrow tracking-[0.38em] mb-6 text-red-400/90"
            >
              Fire Protection & Compliance
            </motion.p>
            <motion.h1
              variants={stagger}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white leading-[1.05] mb-8 font-[family-name:var(--font-syne)]"
            >
              <motion.span
                variants={fadeUp}
                className="block"
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
              >
                Compliance.
              </motion.span>
              <motion.span
                variants={fadeUp}
                className="block"
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
              >
                Protection.
              </motion.span>
              <motion.span
                variants={fadeUp}
                className="relative block"
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
              >
                <span className="relative z-10 block text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-400 to-red-600 bg-[length:200%_auto] animate-[gradient-shift_4s_ease_infinite] drop-shadow-[0_0_40px_rgba(251,146,60,0.35)]">
                  Confidence.
                </span>
                <motion.span
                  className="absolute -inset-2 rounded-lg bg-red-500/10 blur-xl -z-10"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              </motion.span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed [text-wrap:balance]"
            >
              One audit failure can shut you down. We deliver fire protection systems,
              servicing, and compliance solutions that keep your business operational
              and audit-ready.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.a
                href="#contact"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold rounded-xl overflow-hidden nf-btn-primary text-white transition-[filter,transform] duration-300"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                  style={{ width: "50%" }}
                />
                <span className="relative z-10">Get Compliant</span>
              </motion.a>
              <motion.a
                href="#contact"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold rounded-xl nf-btn-ghost text-white transition-all duration-300"
                whileHover={{ scale: 1.03, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                Request a Quote
                <ArrowRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </motion.a>
            </motion.div>
          </motion.div>
        </div>
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 hidden sm:block"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-red-500"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Trust Strip with Marquee */}
      <section className="py-12 border-y border-white/[0.06] nf-bg-base relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(220,38,38,0.08),transparent)]"
          aria-hidden
        />
        <div className="container mx-auto px-6 relative">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-sm text-zinc-500 mb-8 tracking-wide"
          >
            Trusted by lodges, estates, and commercial facilities across South Africa
          </motion.p>
          <div className="flex justify-center gap-8 md:gap-14 mb-8 flex-wrap">
            {["SANS 1475", "SAQCC", "ISO 9001"].map((badge, i) => (
              <motion.div
                key={badge}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="px-6 py-3 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent font-mono text-xs text-zinc-400 tracking-[0.2em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                {badge}
              </motion.div>
            ))}
          </div>
          <Marquee items={TRUST_ITEMS} speed={25} />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 nf-bg-raised border-y border-white/[0.06] relative">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(220,38,38,0.04),transparent)]"
          aria-hidden
        />
        <div className="container mx-auto px-6 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
            {[
              { value: 500, suffix: "+", label: "Facilities Protected" },
              { value: 15, suffix: "+", label: "Years Experience" },
              { value: 99, suffix: "%", label: "Audit Pass Rate" },
              { value: 24, suffix: "/7", label: "Support Available" },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-syne)] mb-1">
                  <AnimatedStat
                    value={stat.value}
                    suffix={stat.suffix}
                    className="nf-text-heat drop-shadow-[0_0_28px_rgba(220,38,38,0.2)]"
                  />
                </div>
                <p className="text-sm text-zinc-500 font-mono uppercase tracking-[0.18em]">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-32 nf-bg-base relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-20"
          >
            <motion.p variants={fadeUp} className="nf-eyebrow mb-4">
              What We Deliver
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-syne)]"
            >
              Comprehensive Protection
            </motion.h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  delay: idx * 0.08,
                  type: "spring",
                  stiffness: 100,
                  damping: 20,
                }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative p-8 rounded-2xl border border-white/[0.07] nf-glass-panel nf-card-hover overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <motion.div
                  className="relative mb-6"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <s.icon className="w-11 h-11 text-red-500/90" strokeWidth={1.5} />
                </motion.div>
                <h3 className="relative text-xl font-semibold text-white mb-3 font-[family-name:var(--font-syne)]">
                  {s.title}
                </h3>
                <p className="relative text-zinc-400 text-sm leading-relaxed mb-4">{s.desc}</p>
                <span className="relative inline-flex items-center gap-1 text-xs font-mono text-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ArrowRight className="w-3 h-3" />
                </span>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/services"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl nf-btn-ghost text-white font-semibold transition-all duration-300"
            >
              View all services <ArrowRight className="w-4 h-4 opacity-80" />
            </a>
            <a
              href="/services/fire-extinguisher-servicing"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl border border-white/[0.1] bg-white/[0.03] text-white font-semibold hover:bg-white/[0.06] transition-all duration-300"
            >
              Fire extinguisher servicing <ArrowRight className="w-4 h-4 opacity-80" />
            </a>
          </div>
        </div>
      </section>

      {/* Why Nova Fire - Mission Control */}
      <section id="whynovafire" className="py-32 nf-bg-raised border-y border-white/[0.06] relative">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80 }}
              className="space-y-8"
            >
              <p className="nf-eyebrow">Why Nova Fire</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] font-[family-name:var(--font-syne)]">
                We manage compliance so you can run your business.
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed">
                We supply and install fire equipment—and we protect businesses from
                shutdown, liability, and disaster. Full-service partnership, not just supply.
              </p>
              <ul className="space-y-4">
                {[
                  "Reduced liability through documented compliance",
                  "Audit-ready certification at your fingertips",
                  "Insurance alignment and premium optimization",
                  "Operational continuity and peace of mind",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 text-zinc-300"
                  >
                    <CheckCircle2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80 }}
              className="relative"
            >
              {/* Mission Control Dashboard Card */}
              <div className="relative rounded-2xl nf-glass-panel p-8 overflow-hidden border-white/[0.08]">
                <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-red-600/20 to-orange-500/10 rounded-full blur-3xl" />
                <div className="relative space-y-6">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-mono text-zinc-500">
                      COMPLIANCE STATUS
                    </span>
                  </div>
                  <div className="space-y-4">
                    {["Fire Systems", "Detection", "Certification", "Training"].map(
                      (label, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-zinc-400 text-sm">{label}</span>
                          <div className="flex items-center gap-2">
                            <motion.div
                              className="w-2 h-2 rounded-full bg-emerald-500"
                              animate={{ opacity: [1, 0.4, 1] }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.3,
                              }}
                            />
                            <span className="text-xs font-mono text-emerald-500/80">
                              ACTIVE
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <div className="text-3xl font-bold text-white font-mono">
                      24/7
                    </div>
                    <p className="text-zinc-500 text-sm mt-1">
                      Monitoring & support
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-32 nf-bg-base relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(220, 38, 38, 0.15) 0%, transparent 70%)",
          }}
        />
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <Quote className="w-12 h-12 text-red-500/30 mx-auto mb-8" />
            <blockquote className="text-2xl md:text-3xl font-medium text-white leading-relaxed font-[family-name:var(--font-syne)] mb-8">
              &ldquo;Nova Fire doesn&apos;t just check boxes. They understand that our
              guests&apos; safety and our lodge&apos;s ability to operate depend on
              compliance. They make it seamless.&rdquo;
            </blockquote>
            <div>
              <p className="text-zinc-400 font-semibold">Operations Director</p>
              <p className="text-zinc-500 text-sm">Luxury Safari Lodge, Limpopo</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-32 nf-bg-base">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-20"
          >
            <motion.p variants={fadeUp} className="nf-eyebrow mb-4">
              Sectors We Serve
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-syne)]"
            >
              Industries Served
            </motion.h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {INDUSTRIES.map((ind, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: idx * 0.1,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{
                  y: -6,
                  borderColor: "rgba(220, 38, 38, 0.3)",
                  transition: { duration: 0.2 },
                }}
                className="group p-10 rounded-2xl border border-white/[0.07] nf-bg-raised nf-card-hover text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <ind.icon className="w-14 h-14 text-red-500/80 mx-auto mb-5 group-hover:text-red-500 transition-colors" strokeWidth={1.5} />
                </motion.div>
                <h3 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)]">
                  {ind.title}
                </h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process - Connected Timeline */}
      <section id="process" className="py-32 nf-bg-raised border-y border-white/[0.06]">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-20"
          >
            <motion.p variants={fadeUp} className="nf-eyebrow mb-4">
              Our Process
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-syne)]"
            >
              Simple. Proven. Effective.
            </motion.h2>
          </motion.div>
          <div className="relative max-w-5xl mx-auto">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
            <motion.div
              className="hidden lg:block absolute top-12 left-[12.5%] h-px bg-red-500/60"
              initial={{ width: "0%" }}
              whileInView={{ width: "75%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ maxWidth: "75%" }}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {PROCESS_STEPS.map((p, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: idx * 0.15,
                    type: "spring",
                    stiffness: 100,
                  }}
                  className="relative text-center"
                >
                  <motion.div
                    className="relative z-10 inline-flex items-center justify-center w-24 h-24 rounded-2xl border border-red-500/25 nf-bg-base text-transparent bg-clip-text bg-gradient-to-br from-orange-300 to-red-600 font-mono text-2xl font-bold mb-6 mx-auto shadow-[0_0_40px_rgba(220,38,38,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]"
                    whileHover={{
                      scale: 1.05,
                      borderColor: "rgba(220, 38, 38, 0.6)",
                      boxShadow: "0 0 30px rgba(220, 38, 38, 0.2)",
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </motion.div>
                  <h3 className="text-xl font-semibold text-white mb-2 font-[family-name:var(--font-syne)]">
                    {p.step}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{p.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Fire Compliance Self-Assessment */}
      <ComplianceAssessment />

      {/* CTA - Premium Glow */}
      <section className="py-32 nf-bg-base relative">
        <div className="container mx-auto px-6">
          <SectionDivider />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-6 md:mx-auto max-w-5xl mt-16"
        >
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-orange-500/35 via-red-600/55 to-red-700/35 blur-md opacity-80" />
          <div className="relative overflow-hidden rounded-2xl border border-red-500/30 nf-bg-base shadow-[0_0_80px_rgba(220,38,38,0.12)]">
            <div
              className="absolute inset-0 opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220, 38, 38, 0.25) 0%, transparent 60%)",
              }}
            />
            <div className="relative grid md:grid-cols-2 gap-0">
              <div className="p-12 md:p-16 flex flex-col justify-center text-center md:text-left">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 font-[family-name:var(--font-syne)] leading-tight">
                  Fire compliance isn&apos;t optional.
                </h2>
                <p className="text-zinc-400 text-lg mb-6 md:mb-0">
                  Peace of mind should be standard. Book a compliance assessment
                  and let us handle the rest.
                </p>
              </div>
              <div className="p-12 md:p-16 flex flex-col justify-center items-center md:items-end border-t md:border-t-0 md:border-l border-white/5">
                <motion.a
                  href="#contact"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-10 py-4 text-base font-semibold rounded-xl nf-btn-primary text-white transition-[filter]"
                >
                  Book a Compliance Assessment
                  <ArrowRight className="w-5 h-5" />
                </motion.a>
                <p className="mt-4 text-xs text-zinc-500 font-mono">
                  No obligation • Response within 24h
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </div>
  );
}
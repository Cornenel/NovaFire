"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { StablePhoto } from "@/components/quiet-ground/stable-photo";

type PointStatus = "ok" | "due" | "fail";

type ConstellationPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  status: PointStatus;
};

type SectorId = "lodge" | "estate" | "commercial" | "industrial";

const SECTORS: Record<
  SectorId,
  {
    title: string;
    place: string;
    image: string;
    score: number;
    nextService: string;
    quote: string;
    attribution: string;
    fear: string;
    relief: string;
    systems: Array<{ label: string; status: string; tone: PointStatus }>;
    points: ConstellationPoint[];
  }
> = {
  lodge: {
    title: "Hospitality & lodges",
    place: "Lodge · Limpopo",
    image: "/quiet-ground/sector-lodge.png",
    score: 94,
    nextService: "18 Oct",
    quote:
      "They understand that our guests' safety and our lodge's ability to operate depend on compliance. They make it seamless.",
    attribution: "Operations Director · Luxury safari lodge, Limpopo",
    fear: "One failed audit closes the lodge.",
    relief: "We supply, service, and certify so the doors stay open.",
    systems: [
      { label: "Fire systems", status: "ACTIVE", tone: "ok" },
      { label: "Detection", status: "ACTIVE", tone: "ok" },
      { label: "Certification", status: "ACTIVE", tone: "ok" },
      { label: "Hose reel block B", status: "DUE 30D", tone: "due" },
    ],
    points: [
      { id: "e1", label: "Extinguisher", x: 28, y: 58, status: "ok" },
      { id: "h1", label: "Hose reel", x: 44, y: 52, status: "ok" },
      { id: "d1", label: "Detector", x: 58, y: 42, status: "due" },
      { id: "c1", label: "Cert date", x: 72, y: 48, status: "ok" },
      { id: "e2", label: "Extinguisher", x: 38, y: 68, status: "ok" },
      { id: "d2", label: "Detector", x: 63, y: 62, status: "ok" },
    ],
  },
  estate: {
    title: "Estates & complexes",
    place: "Estate · Western Cape",
    image: "/quiet-ground/sector-estate.png",
    score: 91,
    nextService: "02 Nov",
    quote:
      "When the insurer asks for certificates, we open one file. Doors stay open. Owners stay calm.",
    attribution: "Estate manager · Coastal estate, Western Cape",
    fear: "One missing certificate stalls an entire complex.",
    relief: "We keep SANS paperwork living — not buried in a drawer.",
    systems: [
      { label: "Fire systems", status: "ACTIVE", tone: "ok" },
      { label: "Detection", status: "ACTIVE", tone: "ok" },
      { label: "Gatehouse kit", status: "DUE 30D", tone: "due" },
      { label: "Certification", status: "ACTIVE", tone: "ok" },
    ],
    points: [
      { id: "g1", label: "Gatehouse", x: 32, y: 55, status: "ok" },
      { id: "e1", label: "Extinguisher", x: 48, y: 48, status: "ok" },
      { id: "h1", label: "Hose reel", x: 61, y: 58, status: "due" },
      { id: "d1", label: "Detector", x: 74, y: 46, status: "ok" },
      { id: "c1", label: "Cert date", x: 55, y: 70, status: "ok" },
    ],
  },
  commercial: {
    title: "Commercial property",
    place: "Commercial · Gauteng",
    image: "/quiet-ground/sector-commercial.png",
    score: 88,
    nextService: "12 Sep",
    quote:
      "Our landlord risk is shutdown. Nova Fire keeps the paper ready before the broker calls.",
    attribution: "Facilities lead · Commercial block, Johannesburg",
    fear: "An insurer letter should not become an evacuation.",
    relief: "Certificates, services, and site truth — one quiet system.",
    systems: [
      { label: "Fire systems", status: "ACTIVE", tone: "ok" },
      { label: "Detection", status: "ATTENTION", tone: "fail" },
      { label: "Certification", status: "DUE 30D", tone: "due" },
      { label: "Hose reels", status: "ACTIVE", tone: "ok" },
    ],
    points: [
      { id: "e1", label: "Extinguisher", x: 26, y: 60, status: "ok" },
      { id: "d1", label: "Detector", x: 42, y: 45, status: "fail" },
      { id: "h1", label: "Hose reel", x: 57, y: 55, status: "ok" },
      { id: "c1", label: "Cert date", x: 70, y: 50, status: "due" },
      { id: "e2", label: "Extinguisher", x: 48, y: 68, status: "ok" },
    ],
  },
  industrial: {
    title: "Industrial sites",
    place: "Cold store · Gauteng",
    image: "/quiet-ground/sector-industrial.png",
    score: 86,
    nextService: "29 Sep",
    quote:
      "Night shift cannot wait for paperwork. Compliance has to be already true at 02:00.",
    attribution: "Plant manager · Cold-storage facility, Gauteng",
    fear: "A failed check stops production — and the season.",
    relief: "We keep systems watched and certificates current.",
    systems: [
      { label: "Fire systems", status: "ACTIVE", tone: "ok" },
      { label: "Detection", status: "ACTIVE", tone: "ok" },
      { label: "Plant hose grid", status: "DUE 30D", tone: "due" },
      { label: "Certification", status: "ACTIVE", tone: "ok" },
    ],
    points: [
      { id: "e1", label: "Extinguisher", x: 30, y: 58, status: "ok" },
      { id: "d1", label: "Detector", x: 46, y: 42, status: "ok" },
      { id: "h1", label: "Hose reel", x: 62, y: 52, status: "due" },
      { id: "c1", label: "Cert date", x: 75, y: 47, status: "ok" },
      { id: "e2", label: "Panel", x: 52, y: 66, status: "ok" },
    ],
  },
};

const CHAPTERS = [
  {
    id: "ground-chapter",
    title: "Ground",
    line: "Supply and install on the site that has to stay open.",
    href: "/services/fire-hydrant-supply-installation",
    image: "/quiet-ground/chapter-ground.png",
  },
  {
    id: "watch-chapter",
    title: "Watch",
    line: "Service, detection, and monitoring — even at 2am.",
    href: "/services/fire-extinguisher-servicing",
    image: "/quiet-ground/chapter-watch.png",
  },
  {
    id: "paper-chapter",
    title: "Paper that holds",
    line: "Risk, SANS certification, and drills you can defend.",
    href: "/training",
    image: "/quiet-ground/chapter-paper.png",
  },
];

const PROCESS = [
  { step: "Assess", light: "First light" },
  { step: "Service", light: "Working day" },
  { step: "Certify", light: "Blue hour" },
  { step: "Maintain", light: "Night watch" },
];

function statusColor(status: PointStatus) {
  if (status === "ok") return "bg-[var(--nf-gold)] shadow-[0_0_12px_rgba(232,163,23,0.55)]";
  if (status === "due") return "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.45)]";
  return "bg-[var(--nf-urgency)] shadow-[0_0_12px_rgba(220,38,38,0.45)]";
}

function toneClass(tone: PointStatus) {
  if (tone === "ok") return "text-[var(--nf-gold)] bg-[rgba(232,163,23,0.1)]";
  if (tone === "due") return "text-amber-400 bg-amber-500/10";
  return "text-red-400 bg-red-500/10";
}

function Constellation({
  points,
  active,
  lit,
}: {
  points: ConstellationPoint[];
  active: boolean;
  lit?: boolean;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
        {points.slice(0, -1).map((p, i) => {
          const n = points[i + 1];
          return (
            <motion.line
              key={`${p.id}-line`}
              x1={p.x}
              y1={p.y}
              x2={n.x}
              y2={n.y}
              stroke="rgba(232,163,23,0.35)"
              strokeWidth="0.15"
              initial={{ opacity: 0 }}
              animate={{ opacity: active ? 1 : 0.25 }}
              transition={{ delay: 0.15 * i + 0.4, duration: 0.6 }}
            />
          );
        })}
      </svg>
      {points.map((p, i) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{
            opacity: active || lit ? 1 : 0.35,
            scale: lit ? 1.15 : 1,
          }}
          transition={{ delay: 0.18 * i, duration: 0.45, ease: "easeOut" }}
        >
          <span
            className={`block h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${statusColor(p.status)}`}
            title={p.label}
          />
        </motion.div>
      ))}
    </div>
  );
}

export default function QuietGroundHome() {
  const [sector, setSector] = useState<SectorId>("lodge");
  const [hovered, setHovered] = useState<SectorId | null>(null);
  const [online, setOnline] = useState(false);
  const current = SECTORS[sector];
  const heroPoints = useMemo(() => SECTORS.lodge.points, []);

  useEffect(() => {
    const t = window.setTimeout(() => setOnline(true), 180);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen nf-obsidian text-[#f5f0e8]">
      <Navbar />

      {/* 1. Night hero — property must always be visible */}
      <section className="relative min-h-[100svh] overflow-hidden bg-[#1a1410]">
        <StablePhoto
          src="/quiet-ground/hero-lodge.png"
          alt="South African lodge at blue hour — thatch, lanterns, mopane silhouettes"
          priority
          objectPosition="center 40%"
        />
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(90deg, rgba(11,9,8,0.72) 0%, rgba(11,9,8,0.35) 48%, rgba(11,9,8,0.15) 72%, rgba(11,9,8,0.4) 100%), linear-gradient(to top, rgba(11,9,8,0.82) 0%, transparent 42%)",
          }}
        />
        <div className="absolute inset-0 z-[2]">
          <Constellation points={heroPoints} active={online} />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-20 pt-28 sm:px-6 sm:pb-24 lg:justify-center lg:pb-0">
          <div className="max-w-xl text-left">
            <p className="nf-eyebrow mb-5">Quiet ground</p>
            <h1 className="font-[family-name:var(--font-syne)] text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-[#f5f0e8]">
              One failed audit closes the lodge.
            </h1>
            <p className="mt-5 max-w-md text-base sm:text-lg leading-relaxed text-[var(--nf-dust)]">
              We supply, service, and certify so the doors stay open.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link
                href="#watch"
                className="inline-flex items-center justify-center gap-2 rounded-md nf-btn-primary px-6 py-3.5 text-sm"
              >
                Check your ground
              </Link>
              <a
                href="tel:+27662700293"
                className="text-sm text-[var(--nf-dust)] hover:text-[#f5f0e8] transition-colors sm:ml-2"
              >
                066 270 0293
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Pick your ground */}
      <section id="ground" className="border-t border-[rgba(201,184,164,0.1)] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="mb-10 max-w-xl">
            <p className="nf-eyebrow mb-3">Pick your ground</p>
            <h2 className="font-[family-name:var(--font-syne)] text-3xl sm:text-4xl font-bold tracking-tight">
              The buyer who cannot afford a shutdown.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {(Object.keys(SECTORS) as SectorId[]).map((id) => {
              const s = SECTORS[id];
              const selected = sector === id;
              const isHover = hovered === id;
              return (
                <button
                  key={id}
                  type="button"
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(id)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setSector(id)}
                  className={`group relative aspect-[16/10] overflow-hidden rounded-lg text-left border transition-colors ${
                    selected
                      ? "border-[var(--nf-gold)]/50"
                      : "border-[rgba(201,184,164,0.12)] hover:border-[rgba(232,163,23,0.35)]"
                  }`}
                >
                  <StablePhoto src={s.image} alt={s.title} />
                  <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#0b0908] via-[#0b0908]/35 to-transparent" />
                  <div className="absolute inset-0 z-[2]">
                    <Constellation points={s.points} active={selected || isHover} lit={isHover} />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-[3] p-5">
                    <p className="font-[family-name:var(--font-syne)] text-lg sm:text-xl font-semibold">
                      {s.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--nf-dust)]">{s.place}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <blockquote className="mt-10 max-w-3xl border-l border-[var(--nf-gold)]/40 pl-5">
            <p className="text-lg sm:text-xl leading-relaxed text-[#f5f0e8]/95 font-[family-name:var(--font-syne)]">
              “{current.quote}”
            </p>
            <footer className="mt-3 text-sm text-[var(--nf-dust)]">{current.attribution}</footer>
          </blockquote>
        </div>
      </section>

      {/* 3. Watch — living site map product surface */}
      <section
        id="watch"
        className="border-t border-[rgba(201,184,164,0.1)] bg-[#0f0c0a] py-20 sm:py-28 scroll-mt-24"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <p className="nf-eyebrow mb-3">Watch</p>
            <h2 className="font-[family-name:var(--font-syne)] text-3xl sm:text-4xl font-bold tracking-tight">
              Living site map
            </h2>
            <p className="mt-4 text-[var(--nf-dust)] leading-relaxed">
              Gold = in date. Amber = due in 30 days. Red = failed or missing. This is the
              product surface a GM would trust — not a quiz in a tuxedo.
            </p>
            <p className="mt-3 text-[var(--nf-dust)] leading-relaxed">
              <span className="text-[#f5f0e8]">{current.fear}</span> {current.relief}
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.35fr_0.95fr] gap-4 lg:gap-5 items-stretch">
            <div className="relative min-h-[320px] sm:min-h-[420px] overflow-hidden rounded-lg border border-[rgba(201,184,164,0.12)] bg-[#161210]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={sector}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0"
                >
                  <StablePhoto src={current.image} alt={current.title} objectPosition="center" />
                  <div className="absolute inset-0 z-[1] bg-[#0b0908]/30" />
                  <div className="absolute inset-0 z-[2]">
                    <Constellation points={current.points} active />
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-3 left-3 z-[3] flex flex-wrap gap-3 text-[11px] font-mono uppercase tracking-wider text-[var(--nf-dust)]">
                <span className="inline-flex items-center gap-1.5 rounded bg-[#0b0908]/70 px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--nf-gold)]" /> In date
                </span>
                <span className="inline-flex items-center gap-1.5 rounded bg-[#0b0908]/70 px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Due 30d
                </span>
                <span className="inline-flex items-center gap-1.5 rounded bg-[#0b0908]/70 px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--nf-urgency)]" /> Attention
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-[rgba(201,184,164,0.14)] bg-[#161210] p-5 sm:p-6 flex flex-col">
              <p className="text-sm text-[var(--nf-dust)]">{current.place}</p>
              <p className="mt-3 font-[family-name:var(--font-syne)] text-4xl font-bold text-[var(--nf-gold)]">
                {current.score}
                <span className="ml-2 text-sm font-mono font-normal tracking-wider text-[var(--nf-dust)]">
                  compliance score
                </span>
              </p>

              <ul className="mt-5 space-y-2">
                {current.systems.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between gap-3 rounded-md border border-[rgba(201,184,164,0.1)] px-3 py-2.5"
                  >
                    <span className="text-sm text-[#f5f0e8]">{row.label}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded ${toneClass(row.tone)}`}>
                      {row.status}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between px-1 pt-2">
                  <span className="text-sm text-[var(--nf-dust)]">Next service</span>
                  <span className="font-mono text-sm text-[#f5f0e8]">{current.nextService}</span>
                </li>
              </ul>

              <Link
                href="#compliance-assessment"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-md nf-btn-primary px-5 py-3.5 text-sm"
              >
                Get this for your site
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="mt-3 text-center text-xs text-[var(--nf-dust)]/80">
                24h response · No obligation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Chapters */}
      <section id="chapters" className="border-t border-[rgba(201,184,164,0.1)] scroll-mt-24">
        {CHAPTERS.map((chapter, idx) => (
          <article
            key={chapter.id}
            className="relative min-h-[70vh] sm:min-h-[80vh] overflow-hidden border-b border-[rgba(201,184,164,0.08)] bg-[#1a1410]"
          >
            <StablePhoto src={chapter.image} alt={chapter.title} />
            <div
              className="absolute inset-0 z-[1]"
              style={{
                background:
                  idx % 2 === 0
                    ? "linear-gradient(90deg, rgba(11,9,8,0.82) 0%, rgba(11,9,8,0.4) 55%, rgba(11,9,8,0.18) 100%)"
                    : "linear-gradient(270deg, rgba(11,9,8,0.82) 0%, rgba(11,9,8,0.4) 55%, rgba(11,9,8,0.18) 100%)",
              }}
            />
            <div
              className={`relative z-10 mx-auto flex min-h-[70vh] sm:min-h-[80vh] max-w-6xl items-end px-5 py-16 sm:px-6 sm:py-20 ${
                idx % 2 === 0 ? "justify-start" : "sm:justify-end"
              }`}
            >
              <div className="max-w-md">
                <p className="nf-eyebrow mb-3">{String(idx + 1).padStart(2, "0")}</p>
                <h2 className="font-[family-name:var(--font-syne)] text-3xl sm:text-5xl font-bold">
                  {chapter.title}
                </h2>
                <p className="mt-4 text-base sm:text-lg text-[var(--nf-dust)] leading-relaxed">
                  {chapter.line}
                </p>
                <Link
                  href={chapter.href}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--nf-gold)] hover:underline underline-offset-4"
                >
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* 5. Proof */}
      <section id="proof" className="border-t border-[rgba(201,184,164,0.1)] py-20 sm:py-28 scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="nf-eyebrow mb-3">Proof</p>
          <h2 className="font-[family-name:var(--font-syne)] text-3xl sm:text-4xl font-bold max-w-xl">
            Doors staying open — not “great service.”
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {(["lodge", "estate", "industrial"] as const).map((id) => {
              const s = SECTORS[id];
              return (
                <figure
                  key={id}
                  className="overflow-hidden rounded-lg border border-[rgba(201,184,164,0.12)] bg-[#161210]"
                >
                  <div className="relative aspect-[16/10]">
                    <StablePhoto src={s.image} alt={s.place} />
                  </div>
                  <figcaption className="p-5">
                    <p className="text-sm leading-relaxed text-[#f5f0e8]/95">“{s.quote}”</p>
                    <p className="mt-3 text-xs text-[var(--nf-dust)]">{s.attribution}</p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Process */}
      <section id="process" className="border-t border-[rgba(201,184,164,0.1)] bg-[#0f0c0a] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="nf-eyebrow mb-3">Night sequence</p>
          <h2 className="font-[family-name:var(--font-syne)] text-3xl sm:text-4xl font-bold max-w-xl mb-10">
            Same property. Different light. Points stay on.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PROCESS.map((p, idx) => (
              <div
                key={p.step}
                className="relative overflow-hidden rounded-lg border border-[rgba(201,184,164,0.12)] aspect-[4/5] bg-[#1a1410]"
              >
                <StablePhoto
                  src="/quiet-ground/hero-lodge.png"
                  alt=""
                  imageClassName={`brightness-[${0.55 + idx * 0.1}]`}
                  objectPosition="center"
                />
                <div
                  className="absolute inset-0 z-[1]"
                  style={{
                    background: `linear-gradient(to top, #0b0908 0%, transparent 55%), rgba(11,9,8,${0.15 + idx * 0.05})`,
                  }}
                />
                <div className="absolute inset-0 z-[2]">
                  <Constellation
                    points={heroPoints.map((pt, i) => ({
                      ...pt,
                      x: Math.min(85, pt.x + (idx - 1) * 2),
                      status: i === idx ? "due" : "ok",
                    }))}
                    active
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 z-[3] p-4">
                  <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-[var(--nf-dust)]">
                    {p.light}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-syne)] text-xl font-semibold">
                    {p.step}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="compliance-assessment"
        className="border-t border-[rgba(201,184,164,0.1)] py-20 sm:py-24 scroll-mt-24"
      >
        <div className="mx-auto max-w-3xl px-5 sm:px-6 text-center">
          <p className="nf-eyebrow mb-3">For your site</p>
          <h2 className="font-[family-name:var(--font-syne)] text-3xl sm:text-4xl font-bold">
            Tell us what keeps you awake.
          </h2>
          <p className="mt-4 text-[var(--nf-dust)] leading-relaxed">
            Lodge, estate, commercial, or industrial — we respond within 24 hours with a
            clear next step. No template pitch.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:+27662700293"
              className="inline-flex items-center justify-center rounded-md nf-btn-primary px-6 py-3.5 text-sm"
            >
              Call 066 270 0293
            </a>
            <a
              href="mailto:jacques@novafire.co.za?subject=Quiet%20ground%20site%20check"
              className="inline-flex items-center justify-center rounded-md nf-btn-ghost px-6 py-3.5 text-sm"
            >
              Email Jacques
            </a>
          </div>
        </div>
      </section>

      <section className="relative min-h-[70vh] overflow-hidden bg-[#1a1410]">
        <StablePhoto
          src="/quiet-ground/hero-lodge.png"
          alt=""
          imageClassName="brightness-[0.45]"
        />
        <div className="absolute inset-0 z-[1] bg-[#0b0908]/55" />
        <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-mark.png"
            alt=""
            width={48}
            height={48}
            className="mb-8 h-12 w-12 rounded-full nf-seal border border-[rgba(232,163,23,0.4)] object-cover opacity-90"
          />
          <h2 className="font-[family-name:var(--font-syne)] text-3xl sm:text-5xl font-bold leading-tight">
            Fire compliance isn&apos;t optional.
            <span className="block mt-3 text-[var(--nf-dust)] font-semibold text-2xl sm:text-3xl">
              Quiet ground should be.
            </span>
          </h2>
          <Link
            href="#watch"
            className="mt-10 inline-flex items-center justify-center rounded-md nf-btn-primary px-8 py-4 text-sm"
          >
            Check your ground
          </Link>
          <p className="mt-4 text-xs text-[var(--nf-dust)]">
            No obligation · response within 24 hours
          </p>
          <a
            href="tel:+27662700293"
            className="mt-6 text-sm text-[#f5f0e8] hover:text-[var(--nf-gold)] transition-colors"
          >
            066 270 0293
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

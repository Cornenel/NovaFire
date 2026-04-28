"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Services", href: "/services" },
  { label: "Why Nova Fire", href: "/#whynovafire" },
  { label: "Industries", href: "/#industries" },
  { label: "Process", href: "/#process" },
  { label: "Training", href: "/training" },
  { label: "Contact", href: "/#contact" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  const headerBg = useTransform(
    scrollY,
    [0, 100],
    ["rgba(4,4,6,0.55)", "rgba(6,6,10,0.92)"]
  );
  const headerShadow = useTransform(scrollY, [0, 80], ["0 0 0 rgba(0,0,0,0)", "0 20px 50px rgba(0,0,0,0.35)"]);

  return (
    <motion.header
      style={{
        backgroundColor: headerBg,
        boxShadow: headerShadow,
      }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] backdrop-blur-2xl"
    >
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/35 to-transparent opacity-80"
        aria-hidden
      />
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/25 bg-gradient-to-br from-red-950/80 to-zinc-950/90 shadow-[0_0_24px_rgba(220,38,38,0.15)]">
            <Image
              src="/brand/logo.png"
              alt="Nova Fire"
              fill
              sizes="36px"
              className="p-1.5 object-contain"
              priority
            />
          </span>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-[family-name:var(--font-syne)]">
            Nova<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-600 group-hover:from-red-300 group-hover:via-orange-300 group-hover:to-red-500 transition-all duration-300">Fire</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="relative px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors group rounded-lg hover:bg-white/[0.04]"
            >
              {label}
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 rounded-full bg-gradient-to-r from-orange-500/80 to-red-600 group-hover:w-[70%] transition-all duration-300" />
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/#contact"
            className="hidden sm:inline-flex nf-btn-primary relative px-6 py-2.5 text-sm font-semibold rounded-lg text-white transition-[filter,box-shadow] duration-300"
          >
            Get Compliant
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-red-500/25 hover:bg-white/[0.03] transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/[0.06] nf-bg-raised/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-6 py-4 space-y-0.5">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 px-3 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0"
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/#contact"
                onClick={() => setMobileOpen(false)}
                className="block mt-3 py-3.5 text-center font-semibold rounded-lg nf-btn-primary text-white"
              >
                Get Compliant
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Ground", href: "/#ground" },
  { label: "Watch", href: "/#watch" },
  { label: "Chapters", href: "/#chapters" },
  { label: "Proof", href: "/#proof" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  const headerBg = useTransform(
    scrollY,
    [0, 80],
    ["rgba(11,9,8,0.15)", "rgba(11,9,8,0.88)"]
  );

  return (
    <motion.header
      style={{ backgroundColor: headerBg }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-[rgba(201,184,164,0.08)] backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 shrink-0">
          <span className="relative h-7 w-7 overflow-hidden rounded-full nf-seal border border-[rgba(232,163,23,0.35)] bg-[#161210]">
            <Image
              src="/brand/logo-mark.png"
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover opacity-95"
            />
          </span>
          <span className="text-[15px] sm:text-base font-semibold tracking-tight text-[#f5f0e8] font-[family-name:var(--font-syne)]">
            Nova
            <span className="text-[var(--nf-gold)]">Fire</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="px-3.5 py-2 text-[13px] font-medium text-[var(--nf-dust)]/80 hover:text-[#f5f0e8] transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/#watch"
            className="hidden sm:inline-flex nf-btn-primary px-4 py-2 text-[13px] rounded-md transition-[filter,box-shadow]"
          >
            Check your ground
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-md border border-[rgba(201,184,164,0.15)] text-[var(--nf-dust)]"
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
            className="md:hidden border-t border-[rgba(201,184,164,0.1)] bg-[#0b0908]/95"
          >
            <div className="px-5 py-3 space-y-1">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 text-[var(--nf-dust)] hover:text-[#f5f0e8]"
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/#watch"
                onClick={() => setMobileOpen(false)}
                className="block mt-2 py-3 text-center rounded-md nf-btn-primary text-sm"
              >
                Check your ground
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

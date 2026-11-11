"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { Menu, Phone, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Services", href: "/services" },
  { label: "Industries", href: "/industries" },
  { label: "Compliance", href: "/compliance" },
  { label: "Training", href: "/training" },
  { label: "Service areas", href: "/areas" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  const headerBg = useTransform(
    scrollY,
    [0, 80],
    ["rgba(10,10,10,0.2)", "rgba(10,10,10,0.92)"]
  );

  return (
    <motion.header
      style={{ backgroundColor: headerBg }}
      className="fixed top-0 right-0 left-0 z-50 border-b border-white/[0.06] backdrop-blur-md"
    >
      <div className="nf-container flex items-center justify-between gap-4 py-3.5">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="nf-seal relative h-8 w-8 overflow-hidden rounded-full border border-red-500/35 bg-[#161616]">
            <Image
              src="/brand/logo-mark.png"
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-cover opacity-95"
              priority
            />
          </span>
          <span className="font-[family-name:var(--font-syne)] text-[15px] font-semibold tracking-tight text-zinc-50 sm:text-base">
            Nova<span className="text-red-500">Fire</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="rounded-md px-3 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:text-zinc-50"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="tel:+27662700293"
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:text-zinc-50 sm:inline-flex"
            aria-label="Call Nova Fire"
          >
            <Phone className="h-3.5 w-3.5" />
            066 270 0293
          </a>
          <Link
            href="/services#quote"
            className="nf-btn-primary hidden rounded-md px-4 py-2 text-[13px] transition-[filter,box-shadow] sm:inline-flex"
          >
            Request a quote
          </Link>
          <Link
            href="/client-portal/login"
            className="hidden rounded-md border border-white/10 px-3 py-2 text-[13px] font-medium text-zinc-300 transition-colors hover:border-white/20 hover:text-white md:inline-flex"
          >
            Client portal
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md border border-white/10 p-2 text-zinc-300 lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/[0.06] bg-[#0a0a0a]/96 lg:hidden"
            aria-label="Mobile"
          >
            <div className="space-y-1 px-5 py-3">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 text-zinc-300 hover:text-white"
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/client-portal/login"
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-zinc-300 hover:text-white"
              >
                Client portal
              </Link>
              <a
                href="tel:+27662700293"
                className="block py-3 text-zinc-300 hover:text-white"
              >
                066 270 0293
              </a>
              <Link
                href="/services#quote"
                onClick={() => setMobileOpen(false)}
                className="nf-btn-primary mt-2 block rounded-md py-3 text-center text-sm"
              >
                Request a quote
              </Link>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}

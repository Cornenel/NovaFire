"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Services", href: "/services" },
  { label: "Why Nova Fire", href: "/#whynovafire" },
  { label: "Training", href: "/training" },
  { label: "Compliance Check", href: "/#compliance-assessment" },
];

const LOGIN_LINKS = [
  { label: "Client Portal", href: "/client-portal/login" },
  { label: "Staff Login", href: "/tech-login" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const headerBg = useTransform(
    scrollY,
    [0, 100],
    ["rgba(4,4,6,0.55)", "rgba(6,6,10,0.92)"]
  );
  const headerShadow = useTransform(scrollY, [0, 80], ["0 0 0 rgba(0,0,0,0)", "0 20px 50px rgba(0,0,0,0.35)"]);

  useEffect(() => {
    if (!loginOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!loginRef.current?.contains(event.target as Node)) {
        setLoginOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLoginOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [loginOpen]);

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
      <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="group flex items-center gap-2.5 shrink-0">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-[family-name:var(--font-syne)]">
            Nova<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-600 group-hover:from-red-300 group-hover:via-orange-300 group-hover:to-red-500 transition-all duration-300">Fire</span>
          </span>
        </Link>
        <nav className="hidden lg:flex items-center gap-0.5">
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
        <div className="flex items-center gap-2 sm:gap-3">
          <div ref={loginRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setLoginOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors"
              aria-expanded={loginOpen}
              aria-haspopup="menu"
            >
              Login
              <ChevronDown
                className={`w-4 h-4 transition-transform ${loginOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {loginOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-2 w-44 rounded-xl border border-white/[0.08] nf-bg-raised/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] p-1.5 z-50"
                >
                  {LOGIN_LINKS.map(({ label, href }) => (
                    <Link
                      key={label}
                      href={href}
                      role="menuitem"
                      onClick={() => setLoginOpen(false)}
                      className="block px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                    >
                      {label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Link
            href="/#compliance-assessment"
            className="hidden sm:inline-flex nf-btn-primary relative px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-[filter,box-shadow] duration-300"
          >
            Get Compliant
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-red-500/25 hover:bg-white/[0.03] transition-colors"
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
            className="lg:hidden border-t border-white/[0.06] nf-bg-raised/95 backdrop-blur-xl"
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
              <div className="pt-2 pb-1 px-3">
                <p className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-600 mb-1">
                  Login
                </p>
                {LOGIN_LINKS.map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 text-zinc-400 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
              <Link
                href="/#compliance-assessment"
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

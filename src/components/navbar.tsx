"use client";

import { useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Services", href: "#services" },
  { label: "Why Nova Fire", href: "#whynovafire" },
  { label: "Industries", href: "#industries" },
  { label: "Process", href: "#process" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  const headerBg = useTransform(
    scrollY,
    [0, 80],
    ["rgba(10,10,10,0.5)", "rgba(10,10,10,0.97)"]
  );

  return (
    <motion.header
      style={{ backgroundColor: headerBg }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl"
    >
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <a href="#" className="group flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-white font-[family-name:var(--font-syne)]">
            Nova<span className="text-red-600 group-hover:text-red-500 transition-colors">Fire</span>
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="relative px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors group"
            >
              {label}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-red-500 group-hover:w-3/4 transition-all duration-300" />
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <a
            href="#contact"
            className="hidden sm:inline-flex group relative px-6 py-2.5 text-sm font-semibold rounded overflow-hidden bg-red-600 text-white hover:bg-red-500 transition-colors"
          >
            <span className="relative z-10">Get Compliant</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </a>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 bg-[#0a0a0a]/98"
          >
            <div className="container mx-auto px-6 py-4 space-y-1">
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 text-zinc-400 hover:text-white transition-colors border-b border-white/5 last:border-0"
                >
                  {label}
                </a>
              ))}
              <a
                href="#contact"
                onClick={() => setMobileOpen(false)}
                className="block py-4 text-center font-semibold text-red-500 hover:text-red-400"
              >
                Get Compliant
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

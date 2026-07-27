"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentLevel,
  isCookieConsentLevel,
} from "@/lib/cookie-consent-storage";

function persistConsent(level: CookieConsentLevel) {
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, level);
  } catch {
    /* ignore quota / private mode */
  }
  document.documentElement.dataset.cookieConsent = level;
  window.dispatchEvent(new CustomEvent("nf-cookie-consent", { detail: { level } }));
}

export function CookieConsent() {
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      if (isCookieConsentLevel(raw)) {
        document.documentElement.dataset.cookieConsent = raw;
      } else {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
    setHydrated(true);
  }, []);

  const choose = (level: CookieConsentLevel) => {
    persistConsent(level);
    setOpen(false);
  };

  if (!hydrated || !open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-desc"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-3 sm:p-4 pointer-events-none sm:flex sm:justify-end"
        >
          <div className="pointer-events-auto w-full sm:max-w-md rounded-xl nf-glass-panel backdrop-blur-2xl shadow-[0_-12px_60px_rgba(0,0,0,0.55),0_0_1px_rgba(220,38,38,0.12)_inset] px-4 py-3.5 sm:px-5 relative overflow-hidden">
            <div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/35 to-transparent"
              aria-hidden
            />
            <h2
              id="cookie-consent-title"
              className="relative text-sm font-semibold text-white font-[family-name:var(--font-syne)] tracking-tight"
            >
              Cookies & privacy
            </h2>
            <p id="cookie-consent-desc" className="relative mt-1.5 text-xs text-zinc-400 leading-relaxed">
              We use necessary cookies to run this site. See our{" "}
              <Link href="/legal/cookies" className="text-red-400 hover:text-red-300 underline-offset-2 hover:underline">
                Cookie Policy
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="text-red-400 hover:text-red-300 underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="relative mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => choose("essential")}
                className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-2 rounded-lg nf-btn-ghost transition-colors"
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={() => choose("all")}
                className="text-xs font-semibold text-white nf-btn-primary px-4 py-2 rounded-lg transition-[filter]"
              >
                Accept all
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

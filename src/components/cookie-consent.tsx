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
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pointer-events-none"
        >
          <div className="pointer-events-auto max-w-3xl mx-auto rounded-2xl nf-glass-panel backdrop-blur-2xl shadow-[0_-12px_60px_rgba(0,0,0,0.55),0_0_1px_rgba(220,38,38,0.12)_inset] px-5 py-5 sm:px-6 sm:py-6 relative overflow-hidden">
            <div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/35 to-transparent"
              aria-hidden
            />
            <h2
              id="cookie-consent-title"
              className="relative text-base font-semibold text-white font-[family-name:var(--font-syne)] tracking-tight"
            >
              Cookies & privacy
            </h2>
            <p id="cookie-consent-desc" className="relative mt-2 text-sm text-zinc-400 leading-relaxed">
              We use strictly necessary cookies and similar technologies to run this site (for example
              session security where you use staff tools). Embedded forms may use third-party cookies
              as described in our{" "}
              <Link href="/legal/cookies" className="text-red-400 hover:text-red-300 underline-offset-2 hover:underline">
                Cookie Policy
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="text-red-400 hover:text-red-300 underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              . You can choose whether we may also enable optional analytics or similar tools if we add
              them later.
            </p>
            <div className="relative mt-5 flex flex-col-reverse sm:flex-row sm:flex-wrap sm:items-center gap-3">
              <button
                type="button"
                onClick={() => choose("essential")}
                className="text-sm font-medium text-zinc-400 hover:text-white px-4 py-2.5 rounded-lg nf-btn-ghost transition-colors"
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={() => choose("all")}
                className="text-sm font-semibold text-white nf-btn-primary px-5 py-2.5 rounded-lg transition-[filter]"
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

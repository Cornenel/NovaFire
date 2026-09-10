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
          className="fixed bottom-4 left-4 right-4 z-[100] pointer-events-none sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-xs"
        >
          <div className="pointer-events-auto w-full rounded-lg border border-[rgba(201,184,164,0.14)] bg-[#161210]/95 backdrop-blur-xl px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            <h2
              id="cookie-consent-title"
              className="text-sm font-semibold text-[#f5f0e8] font-[family-name:var(--font-syne)]"
            >
              Cookies
            </h2>
            <p id="cookie-consent-desc" className="mt-1 text-xs text-[var(--nf-dust)] leading-relaxed">
              Necessary cookies only by default.{" "}
              <Link href="/legal/cookies" className="text-[var(--nf-gold)] hover:underline underline-offset-2">
                Policy
              </Link>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => choose("essential")}
                className="text-xs font-medium text-[var(--nf-dust)] hover:text-[#f5f0e8] px-2.5 py-1.5"
              >
                Essential
              </button>
              <button
                type="button"
                onClick={() => choose("all")}
                className="text-xs font-semibold nf-btn-primary px-3 py-1.5 rounded-md"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

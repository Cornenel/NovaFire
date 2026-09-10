"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentLevel,
  isCookieConsentLevel,
} from "@/lib/cookie-consent-storage";

function persistConsent(level: CookieConsentLevel) {
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, level);
  } catch {
    /* ignore */
  }
  document.documentElement.dataset.cookieConsent = level;
  window.dispatchEvent(new CustomEvent("nf-cookie-consent", { detail: { level } }));
}

/**
 * Compact strip under the nav — never covers the hero primary CTA.
 */
export function CookieConsent() {
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      if (isCookieConsentLevel(raw)) {
        document.documentElement.dataset.cookieConsent = raw;
      } else {
        // Defer so the hero CTA is never covered on first paint.
        const t = window.setTimeout(() => setOpen(true), 1200);
        return () => window.clearTimeout(t);
      }
    } catch {
      setOpen(true);
    } finally {
      setHydrated(true);
    }
  }, []);

  if (!hydrated || !open) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed top-[4.25rem] right-3 left-3 z-[90] sm:left-auto sm:right-4 sm:max-w-[17rem]"
    >
      <div className="rounded-md border border-[rgba(201,184,164,0.16)] bg-[#0b0908]/95 px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="cookie-consent-title"
              className="text-[12px] font-semibold text-[#f5f0e8] font-[family-name:var(--font-syne)]"
            >
              Cookies
            </h2>
            <p id="cookie-consent-desc" className="mt-0.5 text-[11px] leading-snug text-[var(--nf-dust)]">
              Essential by default.{" "}
              <Link href="/legal/cookies" className="text-[var(--nf-gold)] underline-offset-2 hover:underline">
                Policy
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                persistConsent("essential");
                setOpen(false);
              }}
              className="px-2 py-1 text-[11px] text-[var(--nf-dust)] hover:text-[#f5f0e8]"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => {
                persistConsent("all");
                setOpen(false);
              }}
              className="rounded nf-btn-primary px-2.5 py-1 text-[11px] font-semibold"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

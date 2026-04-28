"use client";

import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Zoho Form Embed – Lazy-load container
 *
 * INTEGRATION NOTES:
 * - Place your Zoho Forms embed script/iframe inside this component's children.
 * - Scripts are loaded only when the container enters the viewport (IntersectionObserver).
 * - Prevents blocking main thread and improves LCP.
 *
 * Zoho Forms embed typically:
 * 1. Requires a script tag: <script src="https://forms.zohopublic.com/..."></script>
 * 2. Renders into a div with a specific ID (e.g. zohocrm_webform_...)
 *
 * Replace the placeholder below with your actual Zoho embed code.
 * Do NOT hardcode embed IDs – use env vars (NEXT_PUBLIC_ZOHO_FORM_*) for flexibility.
 */

export interface ZohoFormEmbedProps {
  /** Unique identifier for this form container (used for lazy load targeting) */
  formId?: string;
  /** Minimum height to reserve before script loads (prevents layout shift) */
  minHeight?: number;
  /** Additional class names */
  className?: string;
  /** Child content – typically the Zoho embed markup */
  children?: React.ReactNode;
  /** Optional loading state content */
  fallback?: React.ReactNode;
}

export function ZohoFormEmbed({
  formId = "zoho-form-container",
  minHeight = 400,
  className,
  children,
  fallback,
}: ZohoFormEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { rootMargin: "100px", threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    // Signal that viewport entry has occurred – parent can load scripts here
    setHasLoaded(true);
  }, [isVisible]);

  return (
    <div
      ref={containerRef}
      id={formId}
      data-zoho-embed
      data-loaded={hasLoaded}
      className={cn("novafire-form-embed relative", className)}
      style={{ minHeight: hasLoaded ? undefined : minHeight }}
      aria-busy={!hasLoaded}
    >
      {!hasLoaded && fallback && (
        <div className="flex items-center justify-center min-h-[200px] text-zinc-500 text-sm">
          {fallback}
        </div>
      )}
      {hasLoaded && (
        <>
          {/* ZOHO FORM EMBED HERE */}
          {/* Replace this block with your Zoho Forms embed code.
              Example structure:
              <div id="zohocrm_webform_xxxxx"></div>
              <script ...></script>
              Use dynamic script injection if needed – see lib/zoho-forms.ts */}
          {children || (
            <div className="rounded-lg border border-dashed border-red-500/30 bg-red-500/5 p-8 text-center">
              <p className="text-zinc-400 text-sm mb-2">
                Zoho Form embed placeholder
              </p>
              <p className="text-xs text-zinc-500 font-mono">
                Add your Zoho Forms embed code or component here. Form ID:{" "}
                {formId}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

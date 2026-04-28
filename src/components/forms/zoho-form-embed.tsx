"use client";

import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function parseZohoResizeMessage(data: unknown): { perma: string; height: number; scrollIntoView: boolean } | null {
  if (typeof data !== "string") return null;
  const parts = data.split("|");
  if (parts.length !== 2 && parts.length !== 3) return null;
  const perma = parts[0]?.trim();
  const height = Number.parseInt(parts[1] ?? "", 10);
  if (!perma || Number.isNaN(height)) return null;
  return { perma, height, scrollIntoView: parts.length === 3 };
}

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
  /**
   * Optional Zoho "JavaScript embed" URL.
   *
   * Why: iframe embeds cannot be styled to match our design because their DOM
   * is isolated. The JS embed renders the form markup into this page, allowing
   * our `.novafire-form-embed` CSS to apply.
   */
  scriptSrc?: string;
  /** Child content – typically the Zoho embed markup */
  children?: React.ReactNode;
  /** Optional loading state content */
  fallback?: React.ReactNode;
}

export function ZohoFormEmbed({
  formId = "zoho-form-container",
  minHeight = 400,
  className,
  scriptSrc,
  children,
  fallback,
}: ZohoFormEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

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

  useEffect(() => {
    if (!hasLoaded) return;
    if (!scriptSrc) return;
    const el = containerRef.current;
    if (!el) return;

    // Avoid re-injecting if this component re-renders.
    const existing = el.querySelector(`script[data-zoho-script="true"][src="${scriptSrc}"]`);
    if (existing) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.defer = true;
    script.dataset.zohoScript = "true";
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setScriptLoaded(false);
    el.appendChild(script);

    return () => {
      // Keep DOM stable across route transitions; Zoho may attach global handlers.
      // We only remove our injected script on unmount if it still exists.
      script.remove();
    };
  }, [hasLoaded, scriptSrc]);

  // Zoho iframe embeds can postMessage resized heights when `zf_rszfm=1` is present.
  useEffect(() => {
    if (!hasLoaded) return;

    const onMessage = (event: MessageEvent) => {
      const parsed = parseZohoResizeMessage(event.data);
      if (!parsed) return;

      const el = containerRef.current;
      if (!el) return;

      const iframe = el.querySelector("iframe");
      if (!iframe) return;

      // Only apply if this message is for the currently embedded form.
      const src = iframe.getAttribute("src") ?? "";
      if (!src.includes("formperma") || !src.includes(parsed.perma)) return;

      iframe.style.height = `${parsed.height + 15}px`;
      if (parsed.scrollIntoView) {
        iframe.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [hasLoaded]);

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
          {scriptSrc ? (
            <>
              {!scriptLoaded && fallback && (
                <div className="flex items-center justify-center min-h-[200px] text-zinc-500 text-sm">
                  {fallback}
                </div>
              )}
              {/* Zoho's JS embed renders into this container */}
              <div data-zoho-mount className="w-full" />
            </>
          ) : (
            <>
              {/* Default path: allow iframe embed via children */}
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
        </>
      )}
    </div>
  );
}

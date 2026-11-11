"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Optional Lenis smooth scrolling for public marketing routes only.
 * Disabled under prefers-reduced-motion and never mounted on app portals.
 */
export function MarketingSmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const blocked =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/tech") ||
      pathname.startsWith("/client-portal") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/tech-login");
    if (blocked) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let frame = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;

    let cancelled = false;
    (async () => {
      const { default: Lenis } = await import("lenis");
      if (cancelled) return;
      lenis = new Lenis({
        duration: 1.05,
        smoothWheel: true,
      });
      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, [pathname]);

  return null;
}

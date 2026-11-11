"use client";

import { useEffect, useRef, useState } from "react";

/**
 * GSAP ScrollTrigger reveal for marketing sections.
 * Content remains visible by default for SSR/SEO; animation is progressive enhancement.
 */
export function ScrollReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(true);
      return;
    }

    let ctx: { revert: () => void } | null = null;
    let cancelled = false;
    const failSafe = window.setTimeout(() => {
      if (!cancelled) setVisible(true);
    }, 2500);

    (async () => {
      try {
        const gsap = (await import("gsap")).default;
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        setVisible(false);
        ctx = gsap.context(() => {
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.75,
              ease: "power2.out",
              onStart: () => setVisible(true),
              onComplete: () => setVisible(true),
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                once: true,
              },
            }
          );
        }, el);
      } catch {
        setVisible(true);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(failSafe);
      ctx?.revert();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: visible ? undefined : 0 }}
    >
      {children}
    </div>
  );
}

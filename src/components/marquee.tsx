"use client";

import { motion } from "framer-motion";

export function Marquee({ items, speed = 25 }: { items: string[]; speed?: number }) {
  const content = items.join("  •  ");

  return (
    <div className="relative overflow-hidden rounded-full border border-white/[0.06] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent py-3.5 px-2">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--nf-void)] to-transparent z-[1]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--nf-void)] to-transparent z-[1]"
        aria-hidden
      />
      <motion.div
        className="flex w-max gap-16"
        animate={{ x: [0, -((content.length + 16) * 9)] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: speed,
            ease: "linear",
          },
        }}
      >
        <span className="text-xs sm:text-sm font-mono text-zinc-500 tracking-[0.22em] uppercase shrink-0">
          {content} • {content}
        </span>
      </motion.div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";

export function Marquee({ items, speed = 25 }: { items: string[]; speed?: number }) {
  const content = items.join("  •  ");

  return (
    <div className="overflow-hidden">
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
        <span className="text-sm font-mono text-zinc-500 tracking-[0.2em] uppercase shrink-0">
          {content}  •  {content}
        </span>
      </motion.div>
    </div>
  );
}

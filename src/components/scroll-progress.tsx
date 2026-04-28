"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 0.02, 1], [0, 1, 1]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[100] h-[3px] origin-left bg-gradient-to-r from-red-700 via-orange-500 to-amber-400 shadow-[0_0_20px_rgba(220,38,38,0.45)]"
      style={{ scaleX }}
    />
  );
}

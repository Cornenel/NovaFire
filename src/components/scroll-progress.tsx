"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 0.02, 1], [0, 1, 1]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-red-600 origin-left"
      style={{ scaleX }}
    />
  );
}

"use client";

import { motion } from "framer-motion";
import { Wrench, Flame } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-8">
          <Wrench className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-syne)] mb-4">
          Nova<span className="text-red-600">Fire</span>
        </h1>
        <h2 className="text-xl text-zinc-400 mb-6">
          Site Under Maintenance
        </h2>
        <p className="text-zinc-500 leading-relaxed mb-8">
          We&apos;re upgrading our site to serve you better. We&apos;ll be back shortly.
        </p>
        <div className="flex items-center justify-center gap-2 text-zinc-600 text-sm">
          <Flame className="w-4 h-4" />
          <span>Fire protection & compliance · South Africa</span>
        </div>
      </motion.div>
    </div>
  );
}

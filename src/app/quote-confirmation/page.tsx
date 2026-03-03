"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, ArrowRight, FileText } from "lucide-react";

/**
 * Quote Confirmation – Post Smart Quote Engine submission
 */

export default function QuoteConfirmationPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-syne)] mb-4">
          Quote request received
        </h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          We&apos;ve created an opportunity in our system and will email your tailored
          quote within 24 hours. An admin has been notified.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/services"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Request Another Quote
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
        <Link href="/" className="block mt-8 text-sm text-zinc-500 hover:text-white transition-colors">
          ← Back to Home
        </Link>
      </motion.div>
    </div>
  );
}

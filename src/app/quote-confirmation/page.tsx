"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, ArrowRight, FileText } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

/**
 * Quote Confirmation – Post Smart Quote Engine submission
 */

export default function QuoteConfirmationPage() {
  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col items-center justify-center py-20 pt-32 px-6 max-w-md w-full text-center mx-auto"
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
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold nf-btn-primary transition-[filter,box-shadow]"
          >
            <FileText className="w-4 h-4" />
            Request Another Quote
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white nf-btn-ghost transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
        <Link href="/" className="block mt-8 text-sm text-zinc-500 hover:text-white transition-colors">
          ← Back to Home
        </Link>
      </motion.div>
      <SiteFooter variant="compact" />
    </div>
  );
}

"use client";

import React, { Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Phone } from "lucide-react";
import { useSearchParams } from "next/navigation";

/**
 * Thank You Page – Post form submission
 * Used after: Compliance Self-Assessment, Training Registration
 */

function ThankYouContent() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "form";

  const messages: Record<string, { title: string; desc: string; cta: string }> = {
    compliance: {
      title: "Thank you for completing the compliance assessment",
      desc: "We’ve received your results and will be in touch within 24 hours to schedule your professional fire inspection.",
      cta: "Book Professional Inspection",
    },
    training: {
      title: "Training registration received",
      desc: "We’ve sent a confirmation email. Our team will confirm your preferred date and send preparation details shortly.",
      cta: "Return to Training",
    },
    form: {
      title: "Thank you for your submission",
      desc: "We’ve received your information and will respond shortly.",
      cta: "Return to Home",
    },
  };

  const msg = messages[source] || messages.form;

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
          {msg.title}
        </h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          {msg.desc}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={source === "training" ? "/training" : "/#compliance-assessment"}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors"
          >
            {msg.cta}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/#contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Contact Us
          </Link>
        </div>
        <Link href="/" className="block mt-8 text-sm text-zinc-500 hover:text-white transition-colors">
          ← Back to Home
        </Link>
      </motion.div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}

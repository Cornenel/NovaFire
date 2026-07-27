"use client";

import React, { Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Phone } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { useSearchParams } from "next/navigation";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "form";

  const messages: Record<string, { title: string; desc: string; cta: string }> = {
    compliance: {
      title: "Thank you for completing the compliance assessment",
      desc: "We've received your results and will be in touch within 24 hours to schedule your professional fire inspection.",
      cta: "Book Professional Inspection",
    },
    quote: {
      title: "Quote request received",
      desc: "We've received your details and will follow up within 24 hours with a tailored quote.",
      cta: "View services",
    },
    service: {
      title: "Service request received",
      desc: "Our dispatch team has your request and will contact you to schedule the visit.",
      cta: "Back to portal",
    },
    training: {
      title: "Training registration received",
      desc: "We've sent a confirmation email. Our team will confirm your preferred date and send preparation details shortly.",
      cta: "Return to Training",
    },
    form: {
      title: "Thank you for your submission",
      desc: "We've received your information and will respond shortly.",
      cta: "Return to Home",
    },
  };

  const msg = messages[source] || messages.form;
  const ctaHref =
    source === "training"
      ? "/training"
      : source === "quote"
        ? "/services"
        : source === "service"
          ? "/client-portal"
          : "/#compliance-assessment";

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
          {msg.title}
        </h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">{msg.desc}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold nf-btn-primary transition-[filter,box-shadow]"
          >
            {msg.cta}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/#contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white nf-btn-ghost transition-colors"
          >
            <Phone className="w-4 h-4" />
            Contact Us
          </Link>
        </div>
        <Link
          href="/"
          className="block mt-8 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          ← Back to Home
        </Link>
      </motion.div>
      <SiteFooter variant="compact" />
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen nf-bg-base flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}

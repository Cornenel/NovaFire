"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

/**
 * Firetech subdomain – access restricted to staff/admin
 * Share the access URL only with authorised personnel.
 */

export default function TechRestrictedPage() {
  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full text-center mx-auto flex-1 flex flex-col justify-center py-20 pt-32 px-6"
      >
        <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
          Access Restricted
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          This area is for Nova Fire staff and administrators only. Contact your
          administrator for access.
        </p>
        <Link
          href="https://novafire.co.za"
          className="text-sm text-zinc-500 hover:text-white transition-colors"
        >
          ← Return to Nova Fire
        </Link>
      </motion.div>
      <SiteFooter variant="compact" />
    </div>
  );
}

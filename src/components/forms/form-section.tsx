"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export interface FormSectionProps {
  /** Section ID for anchor linking */
  id?: string;
  /** Section title */
  title: string;
  /** Optional subtitle/description */
  description?: string;
  /** Section label (e.g. "Compliance", "Quote") */
  label?: string;
  /** Child content */
  children: React.ReactNode;
  /** Optional max width for content */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /** Additional class names */
  className?: string;
  /** Card variant styling */
  variant?: "default" | "card" | "minimal";
}

const maxWidthClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-xl",
  xl: "max-w-2xl",
  "2xl": "max-w-4xl",
  full: "max-w-full",
};

export function FormSection({
  id,
  title,
  description,
  label,
  children,
  maxWidth = "lg",
  className,
  variant = "card",
}: FormSectionProps) {
  const content = (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={fadeUp}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={cn(
        "w-full mx-auto",
        maxWidthClasses[maxWidth],
        variant === "card" &&
          "rounded-xl border border-white/10 bg-[#0d0d0d]/90 backdrop-blur-sm p-6 sm:p-8",
        variant === "minimal" && "py-6",
        className
      )}
    >
      {label && (
        <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-3">
          {label}
        </p>
      )}
      <h2 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
        {title}
      </h2>
      {description && (
        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-6">
          {description}
        </p>
      )}
      <div className="space-y-6">{children}</div>
    </motion.div>
  );

  if (id) {
    return (
      <section id={id} className="scroll-mt-24">
        {content}
      </section>
    );
  }

  return content;
}

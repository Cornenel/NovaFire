"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MarketingPanel } from "@/components/marketing/primitives";

const ExtinguisherScene = dynamic(
  () => import("@/components/marketing/extinguisher-scene"),
  {
    ssr: false,
    loading: () => <StaticExtinguisherFallback />,
  }
);

function StaticExtinguisherFallback() {
  return (
    <div
      className="flex h-[320px] items-center justify-center rounded-xl border border-white/[0.08] bg-[#121212]"
      role="img"
      aria-label="Static diagram of a portable fire extinguisher"
    >
      <svg viewBox="0 0 200 280" className="h-56 w-40 text-zinc-300" aria-hidden>
        <rect x="78" y="18" width="44" height="18" rx="3" fill="currentColor" opacity="0.7" />
        <rect x="92" y="36" width="16" height="22" fill="#dc2626" />
        <path d="M70 70h60l10 150H60z" fill="#dc2626" />
        <rect x="86" y="90" width="28" height="14" rx="2" fill="#f4f4f5" opacity="0.85" />
        <circle cx="100" cy="130" r="18" fill="none" stroke="#f4f4f5" strokeWidth="3" />
      </svg>
    </div>
  );
}

export function EquipmentDemo() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const saveData =
      "connection" in navigator &&
      Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    // Gate WebGL on desktop-ish, non-reduced-motion, non-save-data contexts.
    setEnabled(!reduce && !saveData && !coarse);
  }, []);

  return (
    <MarketingPanel className="overflow-hidden !p-0">
      <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
        <p className="nf-eyebrow mb-2 text-red-400/80">Interactive equipment</p>
        <h3 className="font-[family-name:var(--font-syne)] text-2xl font-semibold">
          Portable extinguisher anatomy
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          A lightweight demonstration of body, gauge zone and operating head. Drag to rotate when
          3D is available. A static diagram is used on reduced-motion or constrained devices.
        </p>
      </div>
      <div className="p-4 sm:p-6">
        {enabled ? <ExtinguisherScene /> : <StaticExtinguisherFallback />}
      </div>
    </MarketingPanel>
  );
}

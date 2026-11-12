"use client";

import Image from "next/image";
import { MarketingPanel } from "@/components/marketing/primitives";

const SPARES = [
  {
    src: "/images/equipment/valve-head.png",
    title: "Valve head",
    detail: "Operating lever, carrying handle, safety pin and tamper seal assembly.",
  },
  {
    src: "/images/equipment/pressure-gauge.png",
    title: "Pressure gauge",
    detail: "MPa dial with green operating zone — replaced when damaged or out of range.",
  },
  {
    src: "/images/equipment/dip-tube.png",
    title: "Dip tube",
    detail: "Internal pickup tube from valve into the powder charge.",
  },
  {
    src: "/images/equipment/bracket.png",
    title: "Wall bracket",
    detail: "Galvanised mounting bracket that keeps the 9kg unit secured on site.",
  },
] as const;

export function EquipmentDemo() {
  return (
    <MarketingPanel className="overflow-hidden !p-0">
      <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
        <p className="nf-eyebrow mb-2 text-red-400/80">Equipment</p>
        <h3 className="font-[family-name:var(--font-syne)] text-2xl font-semibold">
          9kg DCP fire extinguisher
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Complete portable dry chemical powder unit with the serviceable spares used on site —
          valve head, pressure gauge, dip tube and wall bracket.
        </p>
      </div>

      <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative flex min-h-[360px] items-center justify-center bg-gradient-to-b from-[#1a1a1a] to-[#0e0e0e] p-8 lg:min-h-[480px]">
          <div className="relative h-full w-full max-w-[280px]">
            <Image
              src="/images/equipment/9kg-dcp.png"
              alt="9kg DCP fire extinguisher with hose, nozzle, valve head and pressure gauge"
              fill
              className="object-contain object-center drop-shadow-[0_24px_48px_rgba(0,0,0,0.55)]"
              sizes="(max-width: 1024px) 70vw, 320px"
              priority={false}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-4 pt-16">
            <p className="text-center text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
              9kg DCP · ABC · portable
            </p>
          </div>
        </div>

        <div className="border-t border-white/[0.06] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Spares
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SPARES.map((spare) => (
              <article
                key={spare.title}
                className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#141414]"
              >
                <div className="relative flex h-36 items-center justify-center bg-white">
                  <Image
                    src={spare.src}
                    alt={spare.title}
                    fill
                    className="object-contain p-3"
                    sizes="(max-width: 640px) 50vw, 220px"
                  />
                </div>
                <div className="border-t border-white/[0.06] px-3.5 py-3">
                  <p className="text-sm font-medium text-white">{spare.title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{spare.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </MarketingPanel>
  );
}

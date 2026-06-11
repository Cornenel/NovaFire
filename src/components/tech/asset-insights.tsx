"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  CalendarClock,
  Droplets,
  AlertTriangle,
  TrendingUp,
  Clock,
} from "lucide-react";

/**
 * F1: Smart Asset Insights – read-only, collapsible summary shown on the
 * asset screen. Purely presentational; computed from existing data.
 */

export interface AssetInsightsData {
  lastServicedLabel: string | null;
  nextServiceLabel: string | null;
  hydroTestLabel: string | null;
  refillCount: number;
  lastRefillLabel: string | null;
  defectCount: number;
  assetAgeLabel: string | null;
  trendLabel: string | null;
  trendPositive: boolean;
}

export function AssetInsights({ data }: { data: AssetInsightsData }) {
  const [open, setOpen] = useState(true);

  const rows: Array<{
    icon: typeof Clock;
    text: string;
    tone?: "warn" | "good";
  }> = [];

  if (data.lastServicedLabel)
    rows.push({ icon: Clock, text: data.lastServicedLabel });
  if (data.nextServiceLabel)
    rows.push({ icon: CalendarClock, text: data.nextServiceLabel });
  if (data.hydroTestLabel)
    rows.push({ icon: CalendarClock, text: data.hydroTestLabel, tone: "warn" });
  if (data.refillCount > 0)
    rows.push({
      icon: Droplets,
      text: `${data.refillCount} refill${data.refillCount > 1 ? "s" : ""} on record${
        data.lastRefillLabel ? ` – last ${data.lastRefillLabel}` : ""
      }`,
    });
  if (data.defectCount > 0)
    rows.push({
      icon: AlertTriangle,
      text: `${data.defectCount} defect${data.defectCount > 1 ? "s" : ""} recorded in previous inspections`,
      tone: "warn",
    });
  if (data.assetAgeLabel)
    rows.push({ icon: Clock, text: data.assetAgeLabel });
  if (data.trendLabel)
    rows.push({
      icon: TrendingUp,
      text: data.trendLabel,
      tone: data.trendPositive ? "good" : "warn",
    });

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-sky-300">
          <Sparkles className="w-4 h-4" />
          Asset Insights
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>
      {open && (
        <ul className="px-4 pb-3 space-y-2">
          {rows.map((row, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <row.icon
                className={
                  row.tone === "warn"
                    ? "w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400"
                    : row.tone === "good"
                      ? "w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400"
                      : "w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-500"
                }
              />
              <span
                className={
                  row.tone === "warn" ? "text-amber-200/90" : "text-zinc-300"
                }
              >
                {row.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * F1: Smart Asset Insights – pure, read-only computation from existing
 * asset data. No writes, no workflow changes.
 */

import type { AssetInsightsData } from "@/components/tech/asset-insights";
import type { Asset, AssetEvent, Inspection } from "./types";

function monthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  return Math.round(
    (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
}

/** "11 months ago", "in 3 months", "this month" */
function relativeMonths(dateIso: string, nowIso: string): string {
  const diff = monthsBetween(nowIso, dateIso);
  if (diff === 0) return "this month";
  const abs = Math.abs(diff);
  const unit =
    abs >= 12
      ? `${Math.floor(abs / 12)} year${Math.floor(abs / 12) > 1 ? "s" : ""}`
      : `${abs} month${abs > 1 ? "s" : ""}`;
  return diff < 0 ? `${unit} ago` : `in ${unit}`;
}

export function computeAssetInsights(
  asset: Pick<
    Asset,
    | "last_service_date"
    | "next_service_date"
    | "hydro_test_due_date"
    | "manufacture_date"
  >,
  events: Pick<AssetEvent, "event_type" | "created_at">[],
  inspections: Pick<Inspection, "result" | "created_at">[],
  defectCount: number
): AssetInsightsData {
  const now = new Date().toISOString().slice(0, 10);

  const refills = events.filter((e) => e.event_type === "refilled");
  const lastRefill = refills[0]?.created_at ?? null;

  const ageBasis = asset.manufacture_date;
  let assetAgeLabel: string | null = null;
  if (ageBasis) {
    const months = Math.abs(monthsBetween(ageBasis, now));
    assetAgeLabel =
      months >= 12
        ? `Asset is ${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? "s" : ""} old`
        : `Asset is ${months} month${months !== 1 ? "s" : ""} old`;
  }

  // Service trend: pass rate over the most recent inspections
  let trendLabel: string | null = null;
  let trendPositive = true;
  if (inspections.length >= 2) {
    const recent = inspections.slice(0, 5);
    const passes = recent.filter((i) => i.result === "pass").length;
    trendPositive = passes >= recent.length - passes;
    trendLabel = `${passes} of last ${recent.length} inspections passed`;
  }

  return {
    lastServicedLabel: asset.last_service_date
      ? `Last serviced ${relativeMonths(asset.last_service_date, now)}`
      : null,
    nextServiceLabel: asset.next_service_date
      ? asset.next_service_date < now
        ? `Service overdue – was due ${relativeMonths(asset.next_service_date, now)}`
        : `Next service due ${relativeMonths(asset.next_service_date, now)}`
      : null,
    hydroTestLabel: asset.hydro_test_due_date
      ? asset.hydro_test_due_date < now
        ? `Hydro test overdue – was due ${relativeMonths(asset.hydro_test_due_date, now)}`
        : `Hydro test due ${relativeMonths(asset.hydro_test_due_date, now)}`
      : null,
    refillCount: refills.length,
    lastRefillLabel: lastRefill ? relativeMonths(lastRefill, now) : null,
    defectCount,
    assetAgeLabel,
    trendLabel,
    trendPositive,
  };
}

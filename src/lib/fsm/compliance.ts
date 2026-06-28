/**
 * F5: Customer compliance score (read-only calculation, 0–100%).
 * F8: Revenue opportunity detection (recommendation engine only).
 *
 * Pure functions over existing data – nothing here writes to the database.
 */

import { todayInSA } from "./dates";
import type { Asset } from "./types";

export interface ComplianceInput {
  assets: Pick<
    Asset,
    | "status"
    | "next_service_date"
    | "asset_type"
    | "location_description"
    | "size_capacity"
    | "asset_medium"
    | "calculated_compliance_status"
    | "annual_service_due_date"
    | "pressure_test_due_date"
  >[];
  openDefects: number;
}

export interface ComplianceResult {
  score: number; // 0-100
  status: "green" | "amber" | "red";
  compliantAssets: number;
  defectiveAssets: number;
  missingAssets: number;
  expiredAssets: number;
  pressureTestsDue: number;
  openDefects: number;
  totalAssets: number;
  missingEquipment: string[];
}

export function complianceStatus(score: number): "green" | "amber" | "red" {
  if (score >= 90) return "green";
  if (score >= 70) return "amber";
  return "red";
}

export const COMPLIANCE_STATUS_STYLES: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  red: "bg-red-500/15 text-red-400 border-red-500/40",
};

/**
 * Weighted score:
 *   55% asset health (compliant vs defective/missing)
 *   25% service currency (next_service_date not expired)
 *   20% outstanding defects (relative to asset count)
 * Missing mandatory equipment (F8 rules) subtracts 5 points per category.
 */
export function calculateComplianceScore(
  input: ComplianceInput
): ComplianceResult {
  const today = todayInSA();
  const active = input.assets.filter((a) => a.status !== "removed");
  const total = active.length;

  const compliant = active.filter((a) => effectiveComplianceStatus(a) === "COMPLIANT").length;
  const defective = active.filter(
    (a) =>
      effectiveComplianceStatus(a) === "NON_COMPLIANT" ||
      (!a.calculated_compliance_status && a.status === "defective")
  ).length;
  const missing = active.filter((a) => a.status === "missing").length;
  const expired = active.filter(
    (a) =>
      (a.annual_service_due_date ?? a.next_service_date) !== null &&
      (a.annual_service_due_date ?? a.next_service_date)! < today
  ).length;
  const pressureDue = active.filter(
    (a) =>
      a.pressure_test_due_date !== null &&
      a.pressure_test_due_date !== undefined &&
      a.pressure_test_due_date <= today
  ).length;

  const missingEquipment = detectMissingEquipment(input.assets);

  let score = 100;
  if (total > 0) {
    const healthRatio = compliant / total;
    const currencyRatio = 1 - expired / total;
    const defectFactor = Math.max(0, 1 - input.openDefects / total);
    score =
      100 * (0.55 * healthRatio + 0.25 * currencyRatio + 0.2 * defectFactor);
  }
  score -= missingEquipment.length * 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    status: complianceStatus(score),
    compliantAssets: compliant,
    defectiveAssets: defective,
    missingAssets: missing,
    expiredAssets: expired,
    pressureTestsDue: pressureDue,
    openDefects: input.openDefects,
    totalAssets: total,
    missingEquipment,
  };
}

function effectiveComplianceStatus(
  asset: ComplianceInput["assets"][number]
): "COMPLIANT" | "NON_COMPLIANT" | "WARNING" | "UNKNOWN" {
  if (asset.calculated_compliance_status) return asset.calculated_compliance_status;
  if (asset.status === "compliant" || asset.status === "replaced") return "COMPLIANT";
  if (asset.status === "defective" || asset.status === "missing") return "NON_COMPLIANT";
  return "UNKNOWN";
}

// ── F8: Revenue opportunity rules ──────────────────────────────────────────

interface OpportunityRule {
  /** Keywords found in asset location descriptions that imply an area type */
  keywords: string[];
  areaLabel: string;
  /** Returns true when the site already has suitable equipment */
  satisfied: (assets: ComplianceInput["assets"]) => boolean;
  recommendation: string;
  quoteItem: string;
}

const OPPORTUNITY_RULES: OpportunityRule[] = [
  {
    keywords: ["kitchen", "canteen", "galley", "braai", "boma"],
    areaLabel: "Kitchen / cooking area",
    satisfied: (assets) =>
      assets.some(
        (a) => a.asset_type === "fire_blanket" && a.status !== "removed"
      ),
    recommendation: "No fire blanket recorded – recommend installing a fire blanket.",
    quoteItem: "Fire Blanket Installation",
  },
  {
    keywords: ["electrical", "server", "generator", "switch room", "db board", "plant room"],
    areaLabel: "Electrical / plant area",
    satisfied: (assets) =>
      assets.some(
        (a) =>
          a.status !== "removed" &&
          a.asset_type === "fire_extinguisher" &&
          ((a.asset_medium ?? "").toLowerCase() === "co2" ||
            (a.size_capacity ?? "").toLowerCase().includes("co2"))
      ),
    recommendation:
      "No CO2 extinguisher recorded – recommend installing a CO2 unit for electrical risk.",
    quoteItem: "CO2 Extinguisher Installation",
  },
  {
    keywords: ["escape", "exit", "stairwell", "corridor", "passage"],
    areaLabel: "Escape route",
    satisfied: (assets) =>
      assets.some((a) => a.asset_type === "signage" && a.status === "compliant"),
    recommendation:
      "No compliant escape-route signage recorded – recommend a signage assessment.",
    quoteItem: "Escape Route Signage",
  },
];

export interface RevenueOpportunity {
  areaLabel: string;
  recommendation: string;
  quoteItem: string;
}

export function detectRevenueOpportunities(
  assets: ComplianceInput["assets"]
): RevenueOpportunity[] {
  const locations = assets
    .map((a) => (a.location_description ?? "").toLowerCase())
    .join(" | ");

  return OPPORTUNITY_RULES.filter(
    (rule) =>
      rule.keywords.some((k) => locations.includes(k)) && !rule.satisfied(assets)
  ).map(({ areaLabel, recommendation, quoteItem }) => ({
    areaLabel,
    recommendation,
    quoteItem,
  }));
}

function detectMissingEquipment(
  assets: ComplianceInput["assets"]
): string[] {
  return detectRevenueOpportunities(assets).map((o) => o.quoteItem);
}

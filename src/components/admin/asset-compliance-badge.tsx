import type { Asset } from "@/lib/fsm/types";
import { ASSET_STATUS_LABELS } from "@/lib/fsm/labels";
import { cn } from "@/lib/utils";

const CALCULATED_STATUS_STYLES = {
  COMPLIANT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  NON_COMPLIANT: "bg-red-500/15 text-red-400 border-red-500/40",
  WARNING: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  UNKNOWN: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
} as const;

const CALCULATED_STATUS_LABELS = {
  COMPLIANT: "Compliant",
  NON_COMPLIANT: "Non-compliant",
  WARNING: "Warning",
  UNKNOWN: "Unknown",
} as const;

export function AssetComplianceBadge({
  asset,
  showDetails = false,
}: {
  asset: Pick<
    Asset,
    | "status"
    | "calculated_compliance_status"
    | "compliance_reasons"
    | "compliance_next_actions"
    | "annual_service_due_date"
    | "pressure_test_due_date"
    | "import_raw_data"
  >;
  showDetails?: boolean;
}) {
  const calculated = asset.calculated_compliance_status;
  const status = calculated ?? legacyStatusToCalculated(asset.status);
  const reasons = asset.compliance_reasons ?? [];
  const actions = asset.compliance_next_actions ?? [];
  const rawLabel = ASSET_STATUS_LABELS[asset.status];
  const rawImportedStatus = rawZohoComplianceStatus(asset.import_raw_data);
  const calculatedLabel = CALCULATED_STATUS_LABELS[status];
  const rawDiffers =
    calculated &&
    calculated !== legacyStatusToCalculated(asset.status);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border",
            CALCULATED_STATUS_STYLES[status]
          )}
        >
          {calculatedLabel}
        </span>
        {rawDiffers && (
          <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white/[0.04] text-zinc-400 border-white/10">
            Raw: {rawLabel}
          </span>
        )}
        {rawImportedStatus &&
          rawImportedStatus.toLowerCase() !== calculatedLabel.toLowerCase() && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white/[0.04] text-zinc-400 border-white/10">
              Raw Zoho: {rawImportedStatus}
            </span>
          )}
      </div>
      {showDetails && (
        <div className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3">
          <p className="text-xs font-semibold text-zinc-300 mb-2">
            Compliance Evidence
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs mb-3">
            <p className="text-zinc-500">
              Annual service due:{" "}
              <span className="text-zinc-300">
                {asset.annual_service_due_date ?? "Unknown"}
              </span>
            </p>
            <p className="text-zinc-500">
              Pressure test due:{" "}
              <span className="text-zinc-300">
                {asset.pressure_test_due_date ?? "Unknown"}
              </span>
            </p>
          </div>
          {reasons.length > 0 && (
            <ul className="space-y-1">
              {reasons.map((reason) => (
                <li key={reason} className="text-xs text-zinc-400">
                  {reason}
                </li>
              ))}
            </ul>
          )}
          {actions[0] && (
            <p className="text-xs text-zinc-500 mt-2">
              Next action: <span className="text-zinc-300">{actions[0]}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function rawZohoComplianceStatus(raw: Record<string, unknown> | null | undefined) {
  if (!raw) return null;
  for (const key of [
    "Compliance Status",
    "Compliance Result",
    "Compliant",
    "Is Compliant",
    "Unnamed: 16",
    "Unnamed: 35",
  ]) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function legacyStatusToCalculated(
  status: Asset["status"]
): "COMPLIANT" | "NON_COMPLIANT" | "WARNING" | "UNKNOWN" {
  if (status === "compliant" || status === "replaced") return "COMPLIANT";
  if (status === "defective" || status === "missing") return "NON_COMPLIANT";
  return "UNKNOWN";
}

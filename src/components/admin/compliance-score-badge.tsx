import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import type { ComplianceResult } from "@/lib/fsm/compliance";
import { COMPLIANCE_STATUS_STYLES } from "@/lib/fsm/compliance";
import { cn } from "@/lib/utils";

/** F5: read-only compliance score badge (0–100%, green/amber/red). */
export function ComplianceScoreBadge({
  result,
  size = "sm",
}: {
  result: ComplianceResult;
  size?: "sm" | "lg";
}) {
  const Icon =
    result.status === "green"
      ? ShieldCheck
      : result.status === "amber"
        ? ShieldAlert
        : ShieldX;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        COMPLIANCE_STATUS_STYLES[result.status],
        size === "lg" ? "px-4 py-1.5 text-base" : "px-2.5 py-0.5 text-xs"
      )}
    >
      <Icon className={size === "lg" ? "w-4 h-4" : "w-3 h-3"} />
      {result.score}% compliant
    </span>
  );
}

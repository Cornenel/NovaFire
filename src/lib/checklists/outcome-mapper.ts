import type { AssetStatus } from "@/lib/fsm/types";
import type { OverallEquipmentResult, StoredCheckAnswer } from "./types";

/**
 * Maps detailed checklist outcomes to existing platform concepts.
 * Does not rename or replace existing statuses.
 */
export function mapOverallResultToAssetStatus(
  overall: OverallEquipmentResult
): AssetStatus | null {
  switch (overall) {
    case "serviceable":
    case "pressure_test_due":
      return "compliant";
    case "repair_required":
    case "recharge_required":
    case "quotation_required":
      return "defective";
    case "condemned":
    case "replacement_required":
      return "defective";
    case "unable_to_test":
      return null;
    default:
      return null;
  }
}

export function mapOverallResultToInspectionFlags(overall: OverallEquipmentResult): {
  requiresRefill: boolean;
  requiresPressureTest: boolean;
} {
  return {
    requiresRefill:
      overall === "recharge_required" ||
      overall === "repair_required",
    requiresPressureTest: overall === "pressure_test_due",
  };
}

export function mapOverallResultToLegacyChecklist(
  answers: StoredCheckAnswer[]
): Record<string, boolean> {
  const legacy: Record<string, boolean> = {};
  for (const answer of answers) {
    if (answer.result === "pass") {
      legacy[`${answer.sectionKey}_${answer.checkKey}`] = true;
    } else if (answer.result === "fail") {
      legacy[`${answer.sectionKey}_${answer.checkKey}`] = false;
    }
  }
  return legacy;
}

export function mapToDisplayChecklistStatus(
  dbStatus: string | null | undefined,
  hasInspection: boolean
): import("./types").ChecklistDisplayStatus {
  if (!dbStatus && !hasInspection) return "not_started";
  if (!dbStatus) return "in_progress";
  switch (dbStatus) {
    case "draft":
    case "in_progress":
    case "reopened":
      return "in_progress";
    case "complete":
      return "complete";
    case "complete_with_defects":
      return "complete_with_defects";
    case "unable_to_complete":
      return "unable_to_complete";
    default:
      return "not_started";
  }
}

export function suggestDefectFromFailedCheck(answer: StoredCheckAnswer): {
  defectType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendedAction: string | null;
  quoteRequired: boolean;
} {
  const severity = answer.defectSeverity ?? "medium";
  return {
    defectType: answer.label,
    severity,
    description: answer.notes?.trim() || `Failed check: ${answer.label}`,
    recommendedAction:
      severity === "critical"
        ? "Immediate remedial action required."
        : "Repair or monitor as per company procedure.",
    quoteRequired: severity === "critical" || severity === "high",
  };
}

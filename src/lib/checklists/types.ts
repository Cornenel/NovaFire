import type { AssetType } from "@/lib/fsm/types";

export type CheckAnswerType =
  | "pass_fail_na"
  | "numeric"
  | "text"
  | "boolean"
  | "select";

export type CheckAnswerResult =
  | "pass"
  | "fail"
  | "not_applicable"
  | "not_inspected";

export type ChecklistDisplayStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "complete_with_defects"
  | "unable_to_complete";

export type ChecklistDbStatus =
  | "draft"
  | "in_progress"
  | "complete"
  | "complete_with_defects"
  | "unable_to_complete"
  | "reopened";

export type OverallEquipmentResult =
  | "serviceable"
  | "repair_required"
  | "recharge_required"
  | "pressure_test_due"
  | "condemned"
  | "replacement_required"
  | "quotation_required"
  | "unable_to_test";

export interface ApplicabilityContext {
  assetType: AssetType;
  assetMedium: string | null;
  sizeCapacity: string | null;
  /** Answered during inspection when relevant */
  hasCabinet?: boolean;
  hasHose?: boolean;
  /** Derived from medium / asset metadata */
  isCo2?: boolean;
  isStoredPressure?: boolean;
  isPowder?: boolean;
  isFoam?: boolean;
  isWater?: boolean;
  isWetChemical?: boolean;
}

export interface CheckDefinition {
  key: string;
  label: string;
  answerType: CheckAnswerType;
  mandatory?: boolean;
  applicable?: (ctx: ApplicabilityContext) => boolean;
  failRequiresNote?: boolean;
  failRequiresPhoto?: boolean;
  criticalOnFail?: boolean;
  naRequiresReason?: boolean;
  unit?: string;
  options?: string[];
}

export interface ChecklistSectionDefinition {
  key: string;
  title: string;
  description?: string;
  checks: CheckDefinition[];
}

export interface StoredCheckAnswer {
  sectionKey: string;
  checkKey: string;
  label: string;
  result: CheckAnswerResult;
  valueText?: string | null;
  valueNumber?: number | null;
  unit?: string | null;
  notes?: string | null;
  photoUrls?: string[];
  requiresAction?: boolean;
  defectSeverity?: "low" | "medium" | "high" | "critical" | null;
}

export interface ChecklistDraftPayload {
  checklistId: string;
  jobId: string;
  assetId: string;
  assetType: AssetType;
  technicianId: string;
  answers: StoredCheckAnswer[];
  overallResult?: OverallEquipmentResult | null;
  notes?: string | null;
  finalConditionConfirmed?: boolean;
  customerInformed?: boolean;
}

export interface ChecklistCompletePayload extends ChecklistDraftPayload {
  inspectionId: string;
  legacyChecklist: Record<string, boolean>;
  inspectionResult: "pass" | "fail";
  requiresRefill: boolean;
  requiresPressureTest: boolean;
  serviceDate: string;
  nextServiceDate: string;
  defects: Array<{
    id: string;
    defectType: string;
    severity: string;
    description: string;
    recommendedAction: string | null;
    quoteRequired: boolean;
  }>;
}

export const OVERALL_RESULT_LABELS: Record<OverallEquipmentResult, string> = {
  serviceable: "Serviceable",
  repair_required: "Repair required",
  recharge_required: "Recharge required",
  pressure_test_due: "Pressure test due",
  condemned: "Condemned",
  replacement_required: "Replacement required",
  quotation_required: "Quotation required",
  unable_to_test: "Unable to test",
};

export const CHECKLIST_STATUS_LABELS: Record<ChecklistDisplayStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  complete_with_defects: "Complete with defects",
  unable_to_complete: "Unable to complete",
};

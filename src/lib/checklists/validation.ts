import type {
  ApplicabilityContext,
  CheckDefinition,
  ChecklistSectionDefinition,
  ChecklistCompletePayload,
  OverallEquipmentResult,
  StoredCheckAnswer,
} from "./types";
import { getApplicableChecks } from "./applicability";
import type { InspectionResult } from "@/lib/fsm/types";

export interface ValidationIssue {
  sectionKey: string;
  checkKey: string;
  message: string;
}

export interface ValidationOptions {
  photosRequiredForAllFailures?: boolean;
  allowUnableToTest?: boolean;
}

export function validateChecklistDraft(
  sections: ChecklistSectionDefinition[],
  ctx: ApplicabilityContext,
  answers: StoredCheckAnswer[],
  options: ValidationOptions = {}
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const answerMap = new Map<string, StoredCheckAnswer>(
    answers.map((a) => [`${a.sectionKey}:${a.checkKey}`, a] as const)
  );
  const applicable = getApplicableChecks(sections, ctx);
  const photosRequired = options.photosRequiredForAllFailures ?? true;

  for (const check of applicable) {
    const key = `${check.sectionKey}:${check.key}`;
    const answer = answerMap.get(key);

    if (!answer || answer.result === "not_inspected") {
      if (check.mandatory !== false) {
        issues.push({
          sectionKey: check.sectionKey,
          checkKey: check.key,
          message: `"${check.label}" must be answered.`,
        });
      }
      continue;
    }

    if (answer.result === "fail") {
      if (check.failRequiresNote !== false && !answer.notes?.trim()) {
        issues.push({
          sectionKey: check.sectionKey,
          checkKey: check.key,
          message: `"${check.label}" failure requires a note.`,
        });
      }
      const needsPhoto =
        check.failRequiresPhoto || check.criticalOnFail || photosRequired;
      if (needsPhoto && (!answer.photoUrls || answer.photoUrls.length === 0)) {
        issues.push({
          sectionKey: check.sectionKey,
          checkKey: check.key,
          message: `"${check.label}" failure requires photo evidence.`,
        });
      }
    }

    if (
      answer.result === "not_applicable" &&
      check.naRequiresReason &&
      !answer.notes?.trim()
    ) {
      issues.push({
        sectionKey: check.sectionKey,
        checkKey: check.key,
        message: `"${check.label}" requires a reason for N/A.`,
      });
    }

    if (check.answerType === "numeric" && answer.result === "pass") {
      if (answer.valueNumber === null || answer.valueNumber === undefined) {
        issues.push({
          sectionKey: check.sectionKey,
          checkKey: check.key,
          message: `"${check.label}" requires a numeric reading.`,
        });
      }
    }
  }

  return issues;
}

export function validateChecklistCompletion(
  payload: ChecklistCompletePayload,
  sections: ChecklistSectionDefinition[],
  ctx: ApplicabilityContext,
  options: ValidationOptions = {}
): ValidationIssue[] {
  const issues = validateChecklistDraft(sections, ctx, payload.answers, options);

  if (!payload.overallResult) {
    issues.push({
      sectionKey: "_meta",
      checkKey: "overall_result",
      message: "Select an overall equipment result.",
    });
  }

  if (!payload.finalConditionConfirmed) {
    issues.push({
      sectionKey: "_meta",
      checkKey: "final_condition",
      message: "Confirm the asset final condition after service.",
    });
  }

  const criticalFails = payload.answers.filter(
    (a) => a.result === "fail" && a.defectSeverity === "critical"
  );
  if (criticalFails.length > 0 && !payload.customerInformed) {
    issues.push({
      sectionKey: "_meta",
      checkKey: "customer_informed",
      message: "Confirm the customer was informed about critical findings.",
    });
  }

  return issues;
}

export function deriveSuggestedOverallResult(
  answers: StoredCheckAnswer[]
): OverallEquipmentResult {
  const failed = answers.filter((a) => a.result === "fail");
  if (failed.some((a) => a.defectSeverity === "critical")) {
    if (failed.some((a) => a.checkKey.includes("condemn"))) return "condemned";
    return "replacement_required";
  }
  if (failed.some((a) => a.checkKey.includes("recharge") || a.checkKey.includes("refill"))) {
    return "recharge_required";
  }
  if (failed.some((a) => a.checkKey.includes("pressure_test"))) {
    return "pressure_test_due";
  }
  if (failed.some((a) => a.requiresAction)) {
    return "repair_required";
  }
  if (failed.length > 0) return "repair_required";
  return "serviceable";
}

export function mapOverallResultToInspectionResult(
  overall: OverallEquipmentResult | null | undefined,
  answers: StoredCheckAnswer[]
): InspectionResult {
  if (overall === "unable_to_test") return "fail";
  if (overall === "condemned" || overall === "replacement_required") return "fail";
  const hasFail = answers.some((a) => a.result === "fail");
  return hasFail ? "fail" : "pass";
}

export function countChecklistProgress(
  sections: ChecklistSectionDefinition[],
  ctx: ApplicabilityContext,
  answers: StoredCheckAnswer[]
) {
  const applicable = getApplicableChecks(sections, ctx);
  const answerMap = new Map<string, StoredCheckAnswer>(
    answers.map((a) => [`${a.sectionKey}:${a.checkKey}`, a] as const)
  );
  let answered = 0;
  let failed = 0;
  let na = 0;
  let outstanding = 0;

  for (const check of applicable) {
    const answer = answerMap.get(`${check.sectionKey}:${check.key}`);
    if (!answer || answer.result === "not_inspected") {
      if (check.mandatory !== false) outstanding += 1;
      continue;
    }
    answered += 1;
    if (answer.result === "fail") failed += 1;
    if (answer.result === "not_applicable") na += 1;
  }

  return {
    total: applicable.length,
    answered,
    failed,
    na,
    outstanding,
    percent: applicable.length === 0 ? 0 : Math.round((answered / applicable.length) * 100),
  };
}

import type { CheckDefinition, ApplicabilityContext } from "../types";

/** Build pass/fail/NA checks from labels. */
export function pfChecks(
  items: Array<[string, string]>,
  opts: Partial<CheckDefinition> = {}
): CheckDefinition[] {
  return items.map(([key, label]) => ({
    key,
    label,
    answerType: "pass_fail_na",
    mandatory: true,
    failRequiresNote: true,
    ...opts,
  }));
}

export function pfCheck(
  key: string,
  label: string,
  opts: Partial<CheckDefinition> = {}
): CheckDefinition {
  return {
    key,
    label,
    answerType: "pass_fail_na",
    mandatory: true,
    failRequiresNote: true,
    ...opts,
  };
}

export function numericCheck(
  key: string,
  label: string,
  unit: string,
  opts: Partial<CheckDefinition> = {}
): CheckDefinition {
  return {
    key,
    label,
    answerType: "numeric",
    unit,
    mandatory: true,
    ...opts,
  };
}

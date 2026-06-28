import type { AssetStatus, AssetType, DefectSeverity, DefectStatus } from "@/lib/fsm/types";

export type FireComplianceStatus =
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "WARNING"
  | "UNKNOWN";

export interface FireComplianceConfig {
  annualServiceMonths: number;
  warningDays: number;
  pressureTestIntervals: {
    default: number;
    powder: number;
    dcp: number;
    foam: number;
    water: number;
    co2: number;
  };
}

export const fireComplianceConfig: FireComplianceConfig = {
  annualServiceMonths: 12,
  warningDays: 90,
  pressureTestIntervals: {
    default: 5,
    powder: 5,
    dcp: 5,
    foam: 5,
    water: 5,
    // CO2 intervals can vary by cylinder/test regime. Keep this configurable
    // instead of baking a rule into status decisions.
    co2: 5,
  },
};

export interface ComplianceDefectInput {
  status?: DefectStatus | string | null;
  severity?: DefectSeverity | string | null;
  description?: string | null;
  defectType?: string | null;
  recommendedAction?: string | null;
}

export interface FireExtinguisherComplianceInput {
  assetType?: AssetType | string | null;
  assetStatus?: AssetStatus | string | null;
  assetCode?: string | null;
  customerAssetNumber?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  sizeCapacity?: string | null;
  medium?: string | null;
  manufactureDate?: string | null;
  lastServiceDate?: string | null;
  nextServiceDate?: string | null;
  lastPressureTestDate?: string | null;
  nextPressureTestDate?: string | null;
  workCompletedDate?: string | null;
  workStatus?: string | null;
  rawImportedStatus?: string | null;
  condition?: string | null;
  notes?: string | null;
  technicianName?: string | null;
  technicianSaqccNumber?: string | null;
  unresolvedDefects?: ComplianceDefectInput[];
  today?: string;
  config?: FireComplianceConfig;
}

export interface FireComplianceResult {
  status: FireComplianceStatus;
  reasons: string[];
  nextActions: string[];
  calculatedDates: {
    annualServiceDueDate?: string;
    pressureTestDueDate?: string;
  };
  sourceFieldsUsed: string[];
}

const COMPLETED_KEYWORDS = [
  "completed",
  "serviced",
  "passed",
  "repaired",
  "refilled",
  "recharged",
  "inspected",
  "tested",
  "certified",
  "yes",
  "compliant",
  "pass",
];

const FAILED_KEYWORDS = [
  "failed",
  "rejected",
  "incomplete",
  "not serviced",
  "condemned",
  "damaged beyond service",
  "missing",
  "removed",
  "requires replacement",
  "replacement required",
  "not compliant",
];

const CRITICAL_DEFECT_KEYWORDS = [
  "condemned",
  "damaged",
  "leaking",
  "leak",
  "discharged",
  "no pressure",
  "low pressure",
  "gauge faulty",
  "hose missing",
  "nozzle missing",
  "safety pin missing",
  "seal missing",
  "corrosion",
  "rusted",
  "rust",
  "expired",
  "pressure test due",
  "hydro test due",
  "failed",
  "not serviced",
  "inaccessible",
  "missing",
  "removed",
  "replacement required",
];

const NEGATIVE_DUE_PHRASES = [
  "not due",
  "not yet due",
  "no pressure test required",
  "no pressure test required yet",
  "pressure test not due",
  "hydro test not due",
];

export function evaluateFireExtinguisherCompliance(
  input: FireExtinguisherComplianceInput
): FireComplianceResult {
  const config = input.config ?? fireComplianceConfig;
  const today = parseDate(input.today) ?? stripTime(new Date());
  const reasons: string[] = [];
  const nextActions: string[] = [];
  const sourceFieldsUsed = new Set<string>();

  const combinedStatusText = [
    input.workStatus,
    input.rawImportedStatus,
    input.condition,
    input.notes,
  ].join(" ");
  addSource(sourceFieldsUsed, input.workStatus, "workStatus");
  addSource(sourceFieldsUsed, input.rawImportedStatus, "rawImportedStatus");
  addSource(sourceFieldsUsed, input.condition, "condition");
  addSource(sourceFieldsUsed, input.notes, "notes");

  const latestServiceDate = latestDate([
    sourceDate(input.lastServiceDate, "lastServiceDate", sourceFieldsUsed),
    sourceDate(input.workCompletedDate, "workCompletedDate", sourceFieldsUsed),
  ]);
  const explicitNextServiceDate = sourceDate(
    input.nextServiceDate,
    "nextServiceDate",
    sourceFieldsUsed
  );
  const annualServiceDueDate =
    explicitNextServiceDate ??
    (latestServiceDate
      ? addMonths(latestServiceDate, config.annualServiceMonths)
      : undefined);

  const explicitPressureDueDate = sourceDate(
    input.nextPressureTestDate,
    "nextPressureTestDate",
    sourceFieldsUsed
  );
  const lastPressureTestDate = sourceDate(
    input.lastPressureTestDate,
    "lastPressureTestDate",
    sourceFieldsUsed
  );
  const manufactureDate = sourceDate(
    input.manufactureDate,
    "manufactureDate",
    sourceFieldsUsed
  );
  const pressureIntervalYears = pressureIntervalFor(input, config);
  const pressureTestDueDate =
    explicitPressureDueDate ??
    (lastPressureTestDate
      ? addYears(lastPressureTestDate, pressureIntervalYears)
      : manufactureDate
        ? addYears(manufactureDate, pressureIntervalYears)
        : undefined);

  const isExtinguisher = isFireExtinguisher(input);
  const hasCompletedWork =
    containsAny(combinedStatusText, COMPLETED_KEYWORDS) ||
    Boolean(latestServiceDate && input.workCompletedDate);
  const saysPressureNotDue = containsAny(combinedStatusText, NEGATIVE_DUE_PHRASES);
  const hasFailedWork =
    containsAnyRespectingNegativeDue(
      combinedStatusText,
      saysPressureNotDue
        ? FAILED_KEYWORDS.filter((keyword) => keyword !== "not compliant")
        : FAILED_KEYWORDS
    ) ||
    input.assetStatus === "missing" ||
    input.assetStatus === "removed";
  const pressureDueMentioned =
    mentionsDue(combinedStatusText, ["pressure test", "hydro test"]) &&
    !saysPressureNotDue;

  addSource(sourceFieldsUsed, input.assetStatus, "assetStatus");
  addSource(sourceFieldsUsed, input.assetCode, "assetCode");
  addSource(sourceFieldsUsed, input.customerAssetNumber, "customerAssetNumber");
  addSource(sourceFieldsUsed, input.serialNumber, "serialNumber");
  addSource(sourceFieldsUsed, input.location, "location");
  addSource(sourceFieldsUsed, input.sizeCapacity, "sizeCapacity");
  addSource(sourceFieldsUsed, input.medium, "medium");
  addSource(sourceFieldsUsed, input.technicianSaqccNumber, "technicianSaqccNumber");

  const unresolvedCriticalDefects = (input.unresolvedDefects ?? []).filter((defect) =>
    isUnresolvedCriticalDefect(defect)
  );
  if ((input.unresolvedDefects ?? []).length > 0) {
    sourceFieldsUsed.add("unresolvedDefects");
  }

  const hasIdentity =
    Boolean(input.location) &&
    Boolean(
      input.assetCode ||
        input.customerAssetNumber ||
        input.serialNumber ||
        input.sizeCapacity ||
        input.medium
    );

  if (!isExtinguisher) {
    return {
      status: "UNKNOWN",
      reasons: ["Asset is not recognised as a fire extinguisher."],
      nextActions: ["Review asset type before applying extinguisher compliance rules."],
      calculatedDates: {
        annualServiceDueDate: annualServiceDueDate?.iso,
        pressureTestDueDate: pressureTestDueDate?.iso,
      },
      sourceFieldsUsed: [...sourceFieldsUsed],
    };
  }

  if (!hasIdentity) {
    reasons.push("Missing required identifying data for the extinguisher.");
    nextActions.push("Capture location and an asset number, serial number, capacity or medium.");
  }

  if (!latestServiceDate && !hasCompletedWork) {
    return {
      status: "UNKNOWN",
      reasons: ["No valid service date or completed work date is available."],
      nextActions: ["Confirm latest service/work completion date from service records."],
      calculatedDates: {
        pressureTestDueDate: pressureTestDueDate?.iso,
      },
      sourceFieldsUsed: [...sourceFieldsUsed],
    };
  }

  if (hasFailedWork) {
    reasons.push("Latest work/status indicates the unit failed or requires replacement.");
    nextActions.push("Complete corrective work and record a passing service outcome.");
  }

  if (annualServiceDueDate) {
    if (annualServiceDueDate.iso <= today.iso) {
      reasons.push("Annual service is due or overdue.");
      nextActions.push("Schedule annual service and update service records.");
    } else if (daysBetween(today, annualServiceDueDate) <= config.warningDays) {
      reasons.push("Annual service is approaching.");
      nextActions.push("Plan annual service before the due date.");
    }
  } else {
    reasons.push("Annual service due date could not be calculated.");
    nextActions.push("Capture latest service date or next service date.");
  }

  if (pressureTestDueDate) {
    if (pressureTestDueDate.iso <= today.iso || pressureDueMentioned) {
      reasons.push("Pressure test is due or overdue.");
      nextActions.push("Schedule pressure test and update pressure test records.");
    } else if (daysBetween(today, pressureTestDueDate) <= config.warningDays) {
      reasons.push("Pressure test is approaching.");
      nextActions.push("Plan pressure test before the due date.");
    }
  } else if (saysPressureNotDue) {
    reasons.push("Service complete; pressure test not yet due.");
  } else {
    reasons.push("Pressure test due date could not be calculated.");
    nextActions.push("Capture last or next pressure test date.");
  }

  if (unresolvedCriticalDefects.length > 0) {
    reasons.push("Unresolved critical defect remains on this extinguisher.");
    nextActions.push("Resolve or close the critical defect after corrective action.");
  }

  if (hasCompletedWork && !input.technicianSaqccNumber) {
    reasons.push("Technician SAQCC number is missing for completed service.");
    nextActions.push("Add SAQCC number to the service record where available.");
  }

  const nonCompliantReasons = reasons.filter((reason) =>
    [
      "failed",
      "requires replacement",
      "due or overdue",
      "Unresolved critical defect",
      "Missing required identifying data",
      "could not be calculated",
    ].some((needle) => reason.includes(needle))
  );

  const warningReasons = reasons.filter((reason) =>
    ["approaching", "SAQCC", "not yet due"].some((needle) => reason.includes(needle))
  );

  if (nonCompliantReasons.length > 0) {
    return result("NON_COMPLIANT");
  }

  if (warningReasons.length > 0) {
    return result("WARNING");
  }

  if (hasCompletedWork) {
    reasons.push("Service complete; pressure test not yet due.");
    nextActions.push("Continue normal annual service cycle.");
    return result("COMPLIANT");
  }

  return result("UNKNOWN");

  function result(status: FireComplianceStatus): FireComplianceResult {
    return {
      status,
      reasons: dedupe(reasons),
      nextActions: dedupe(nextActions),
      calculatedDates: {
        annualServiceDueDate: annualServiceDueDate?.iso,
        pressureTestDueDate: pressureTestDueDate?.iso,
      },
      sourceFieldsUsed: [...sourceFieldsUsed].sort(),
    };
  }
}

function isFireExtinguisher(input: FireExtinguisherComplianceInput): boolean {
  const text = normalize(
    `${input.assetType ?? ""} ${input.medium ?? ""} ${input.sizeCapacity ?? ""} ${input.notes ?? ""}`
  );
  return (
    text.includes("fire extinguisher") ||
    text.includes("extinguisher") ||
    ["fire_extinguisher", "co2_unit", "dcp_unit"].includes(String(input.assetType))
  );
}

function pressureIntervalFor(
  input: FireExtinguisherComplianceInput,
  config: FireComplianceConfig
): number {
  const text = normalize(`${input.medium ?? ""} ${input.sizeCapacity ?? ""} ${input.notes ?? ""}`);
  if (text.includes("co2")) return config.pressureTestIntervals.co2;
  if (text.includes("foam")) return config.pressureTestIntervals.foam;
  if (text.includes("water")) return config.pressureTestIntervals.water;
  if (text.includes("powder")) return config.pressureTestIntervals.powder;
  if (text.includes("dcp")) return config.pressureTestIntervals.dcp;
  return config.pressureTestIntervals.default;
}

function isUnresolvedCriticalDefect(defect: ComplianceDefectInput): boolean {
  const status = normalize(defect.status);
  if (["closed", "resolved"].includes(status)) return false;

  const text = normalize(
    `${defect.severity ?? ""} ${defect.defectType ?? ""} ${defect.description ?? ""} ${defect.recommendedAction ?? ""}`
  );
  return (
    text.includes("critical") ||
    containsAnyRespectingNegativeDue(text, CRITICAL_DEFECT_KEYWORDS)
  );
}

function containsAny(value: string | null | undefined, needles: string[]): boolean {
  const haystack = normalize(value);
  return needles.some((needle) => haystack.includes(normalize(needle)));
}

function containsAnyRespectingNegativeDue(
  value: string | null | undefined,
  needles: string[]
): boolean {
  const haystack = normalize(value);
  return needles.some((needle) => {
    const normalizedNeedle = normalize(needle);
    if (
      normalizedNeedle.includes("due") &&
      NEGATIVE_DUE_PHRASES.some((phrase) =>
        haystack.includes(normalize(`${normalizedNeedle.replace(" due", "")} ${phrase}`))
      )
    ) {
      return false;
    }
    return haystack.includes(normalizedNeedle);
  });
}

function mentionsDue(value: string | null | undefined, subjects: string[]): boolean {
  const haystack = normalize(value);
  if (NEGATIVE_DUE_PHRASES.some((phrase) => haystack.includes(normalize(phrase)))) {
    return false;
  }
  return subjects.some((subject) => {
    const normalizedSubject = normalize(subject);
    return (
      haystack.includes(`${normalizedSubject} due`) ||
      haystack.includes(`${normalizedSubject} overdue`) ||
      haystack.includes(`${normalizedSubject} required`)
    );
  });
}

function sourceDate(
  value: string | null | undefined,
  source: string,
  sourceFieldsUsed: Set<string>
): DateValue | undefined {
  const date = parseDate(value);
  if (date) sourceFieldsUsed.add(source);
  return date;
}

function addSource(
  sourceFieldsUsed: Set<string>,
  value: string | null | undefined,
  source: string
) {
  if (value) sourceFieldsUsed.add(source);
}

interface DateValue {
  date: Date;
  iso: string;
}

function parseDate(value: string | null | undefined): DateValue | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return { date: parsed, iso: parsed.toISOString().slice(0, 10) };
}

function stripTime(date: Date): DateValue {
  const parsed = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return { date: parsed, iso: parsed.toISOString().slice(0, 10) };
}

function latestDate(values: Array<DateValue | undefined>): DateValue | undefined {
  return values
    .filter((value): value is DateValue => Boolean(value))
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
}

function addMonths(value: DateValue, months: number): DateValue {
  const date = new Date(value.date);
  date.setUTCMonth(date.getUTCMonth() + months);
  return stripTime(date);
}

function addYears(value: DateValue, years: number): DateValue {
  const date = new Date(value.date);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return stripTime(date);
}

function daysBetween(from: DateValue, to: DateValue): number {
  return Math.ceil((to.date.getTime() - from.date.getTime()) / 86_400_000);
}

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

import type {
  AssetType,
  DefectSeverity,
  InspectionResult,
  JobType,
} from "@/lib/fsm/types";

export const ZOHO_IMPORT_SOURCE = "zoho_import";

const JOB_FIELDS = [
  "Unique ID",
  "Date",
  "Customer Name",
  "Contact Name",
  "Phone",
  "Email",
  "Next Service Date",
  "Customer Name.1",
  "Technicians Name",
  "SAQCC Number",
  "Added Time",
  "Submitters Location",
  "Technicians Report",
] as const;

const REQUIRED_HEADERS = [
  "Unique ID",
  "Date",
  "Customer Name",
  "Contact Name",
  "Phone",
  "Email",
  "Next Service Date",
  "Portable Fire Equipment",
  "Fixed Fire Equipment",
  "Technicians Name",
  "SAQCC Number",
  "Technicians Report",
] as const;

export type EquipmentSection = "portable" | "fixed";

export interface ZohoWarning {
  code: string;
  message: string;
  csvRowNumber?: number;
  severity?: "info" | "warning" | "error";
}

export interface ZohoMappedJob {
  legacyZohoJobcardId: string;
  date: string | null;
  addedTime: string | null;
  customerName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  nextServiceDate: string | null;
  technicianName: string | null;
  saqccNumber: string | null;
  submittersLocation: string | null;
  technicianReport: string | null;
}

export interface ZohoMappedEquipment {
  csvRowNumber: number;
  section: EquipmentSection;
  idempotencyKey: string;
  legacyZohoJobcardId: string;
  rawRow: Record<string, string>;
  job: ZohoMappedJob;
  asset: {
    assetType: AssetType;
    originalDescription: string;
    sizeCapacity: string | null;
    customerAssetNumber: string | null;
    medium: string | null;
    locationDescription: string | null;
    manufactureDate: string | null;
    lastServiceDate: string | null;
    lastPressureTestDate: string | null;
    nextPressureTestDate: string | null;
    importedUnverified: boolean;
  };
  inspection: {
    assetType: AssetType;
    checklist: Record<string, string | boolean | null>;
    result: InspectionResult;
    requiresPressureTest: boolean;
    requiresRefill: boolean;
    notes: string | null;
  };
  defect: {
    shouldCreate: boolean;
    severity: DefectSeverity;
    description: string;
    recommendedAction: string;
  } | null;
  warnings: ZohoWarning[];
}

export interface ZohoPreviewJob {
  legacyZohoJobcardId: string;
  customerName: string | null;
  contactName: string | null;
  date: string | null;
  technicianName: string | null;
  portableAssets: number;
  fixedAssets: number;
  likelyDefects: number;
  warnings: ZohoWarning[];
  status: "ready" | "warning" | "skipped";
}

export interface ZohoParseResult {
  headers: string[];
  totalCsvRows: number;
  skippedRows: number;
  duplicateRows: number;
  warningRows: number;
  equipment: ZohoMappedEquipment[];
  jobs: ZohoPreviewJob[];
  warnings: ZohoWarning[];
  summary: {
    detectedJobs: number;
    portableAssets: number;
    fixedAssets: number;
    likelyDefects: number;
    readyEquipmentRows: number;
  };
}

type CsvRow = Record<string, string>;

export function parseZohoJobcardCsv(csvText: string): ZohoParseResult {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return emptyResult([
      {
        code: "empty_csv",
        message: "CSV file is empty.",
        severity: "error",
      },
    ]);
  }

  const rawHeaders = rows[0].map((h) => h.trim());
  const headers = makeUniqueHeaders(rawHeaders);
  const warnings: ZohoWarning[] = [];
  for (const h of REQUIRED_HEADERS) {
    if (!headers.includes(h)) {
      warnings.push({
        code: "missing_header",
        message: `Expected header "${h}" was not found.`,
        severity: "warning",
      });
    }
  }
  if (headers.length < 44) {
    warnings.push({
      code: "column_count",
      message: `Expected 44 columns but found ${headers.length}. Import will preserve raw rows and warn on unmapped fields.`,
      severity: "warning",
    });
  }

  const state: Partial<Record<(typeof JOB_FIELDS)[number], string>> = {};
  const seenKeys = new Set<string>();
  const equipment: ZohoMappedEquipment[] = [];
  let skippedRows = 0;
  let duplicateRows = 0;

  for (let i = 1; i < rows.length; i++) {
    const csvRowNumber = i + 1;
    const row = rowToObject(headers, rows[i]);
    if (isBlankRow(row) || isQuestionLabelRow(row)) {
      skippedRows++;
      continue;
    }

    for (const field of JOB_FIELDS) {
      const value = clean(row[field]);
      if (value) state[field] = value;
    }

    const rowWarnings: ZohoWarning[] = [];
    const job = mapJob(state, csvRowNumber, rowWarnings);
    const sections: EquipmentSection[] = [];
    if (hasPortableEquipment(row)) sections.push("portable");
    if (hasFixedEquipment(row)) sections.push("fixed");

    if (sections.length === 0) {
      skippedRows++;
      warnings.push({
        code: "row_skipped",
        message: "Row contains no portable or fixed equipment data.",
        csvRowNumber,
        severity: "info",
      });
      continue;
    }

    for (const section of sections) {
      const mapped = mapEquipment(row, csvRowNumber, section, job);
      mapped.warnings.unshift(...rowWarnings);
      if (seenKeys.has(mapped.idempotencyKey)) {
        duplicateRows++;
        mapped.warnings.push({
          code: "duplicate_row",
          message: "Duplicate equipment idempotency key detected in this CSV.",
          csvRowNumber,
          severity: "warning",
        });
      }
      seenKeys.add(mapped.idempotencyKey);
      equipment.push(mapped);
    }
  }

  const allWarnings = [
    ...warnings,
    ...equipment.flatMap((e) => e.warnings),
  ];
  const jobs = buildPreviewJobs(equipment);
  const warningRows = new Set(
    allWarnings
      .map((w) => w.csvRowNumber)
      .filter((row): row is number => typeof row === "number")
  ).size;

  return {
    headers,
    totalCsvRows: Math.max(0, rows.length - 1),
    skippedRows,
    duplicateRows,
    warningRows,
    equipment,
    jobs,
    warnings: allWarnings,
    summary: {
      detectedJobs: jobs.length,
      portableAssets: equipment.filter((e) => e.section === "portable").length,
      fixedAssets: equipment.filter((e) => e.section === "fixed").length,
      likelyDefects: equipment.filter((e) => e.defect?.shouldCreate).length,
      readyEquipmentRows: equipment.length,
    },
  };
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/\D+/g, "");
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const email = clean(value)?.toLowerCase() ?? null;
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function emptyResult(warnings: ZohoWarning[]): ZohoParseResult {
  return {
    headers: [],
    totalCsvRows: 0,
    skippedRows: 0,
    duplicateRows: 0,
    warningRows: warnings.length,
    equipment: [],
    jobs: [],
    warnings,
    summary: {
      detectedJobs: 0,
      portableAssets: 0,
      fixedAssets: 0,
      likelyDefects: 0,
      readyEquipmentRows: 0,
    },
  };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function makeUniqueHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header || `Unnamed: ${index}`;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base}.${count}`;
  });
}

function rowToObject(headers: string[], row: string[]): CsvRow {
  const out: CsvRow = {};
  for (let i = 0; i < headers.length; i++) {
    out[headers[i]] = clean(row[i]) ?? "";
  }
  return out;
}

function clean(value: string | null | undefined): string | null {
  const cleaned = (value ?? "").trim();
  if (!cleaned || cleaned === "-") return null;
  return cleaned;
}

function isBlankRow(row: CsvRow): boolean {
  return Object.values(row).every((value) => !clean(value));
}

function isQuestionLabelRow(row: CsvRow): boolean {
  const values = Object.values(row).join(" ").toLowerCase();
  const noJobData = !clean(row["Unique ID"]) && !clean(row["Customer Name"]);
  return (
    noJobData &&
    (values.includes("device weight") ||
      values.includes("is the seal") ||
      values.includes("hose in good condition") ||
      values.includes("pressure reading"))
  );
}

function hasPortableEquipment(row: CsvRow): boolean {
  return Boolean(
    clean(row["Portable Fire Equipment"]) ||
      clean(row["Unnamed: 7"]) ||
      clean(row["Unnamed: 8"])
  );
}

function hasFixedEquipment(row: CsvRow): boolean {
  return Boolean(
    clean(row["Fixed Fire Equipment"]) ||
      clean(row["Unnamed: 18"]) ||
      clean(row["Unnamed: 19"])
  );
}

function mapJob(
  state: Partial<Record<(typeof JOB_FIELDS)[number], string>>,
  csvRowNumber: number,
  warnings: ZohoWarning[]
): ZohoMappedJob {
  const uniqueId = clean(state["Unique ID"]);
  const customerName =
    clean(state["Customer Name"]) ?? clean(state["Customer Name.1"]);
  const email = clean(state.Email);

  if (!uniqueId) {
    warnings.push({
      code: "missing_unique_id",
      message: "Missing Zoho Unique ID after forward-fill.",
      csvRowNumber,
      severity: "error",
    });
  }
  if (!customerName) {
    warnings.push({
      code: "missing_customer_name",
      message: "Missing customer name after forward-fill.",
      csvRowNumber,
      severity: "warning",
    });
  }
  if (email && !normalizeEmail(email)) {
    warnings.push({
      code: "invalid_email",
      message: `Invalid email format: ${email}`,
      csvRowNumber,
      severity: "warning",
    });
  }

  const date = parseDate(clean(state.Date));
  if (clean(state.Date) && !date) {
    warnings.push({
      code: "invalid_date",
      message: `Could not parse job date: ${state.Date}`,
      csvRowNumber,
      severity: "warning",
    });
  }

  const nextServiceDate = parseDate(clean(state["Next Service Date"]));
  if (clean(state["Next Service Date"]) && !nextServiceDate) {
    warnings.push({
      code: "invalid_next_service_date",
      message: `Could not parse next service date: ${state["Next Service Date"]}`,
      csvRowNumber,
      severity: "warning",
    });
  }

  return {
    legacyZohoJobcardId: uniqueId ?? `missing-${csvRowNumber}`,
    date,
    addedTime: parseDateTime(clean(state["Added Time"])) ?? date,
    customerName,
    contactName: clean(state["Contact Name"]),
    phone: clean(state.Phone),
    email: normalizeEmail(email) ?? email ?? null,
    nextServiceDate,
    technicianName: clean(state["Technicians Name"]),
    saqccNumber: clean(state["SAQCC Number"]),
    submittersLocation: clean(state["Submitters Location"]),
    technicianReport: clean(state["Technicians Report"]),
  };
}

function mapEquipment(
  row: CsvRow,
  csvRowNumber: number,
  section: EquipmentSection,
  job: ZohoMappedJob
): ZohoMappedEquipment {
  const warnings: ZohoWarning[] = [];
  const rawDescription =
    section === "portable"
      ? clean(row["Portable Fire Equipment"])
      : clean(row["Fixed Fire Equipment"]);
  const originalDescription = rawDescription ?? "Unknown equipment";

  const parsed =
    section === "portable"
      ? parsePortableDescription(originalDescription)
      : parseFixedDescription(originalDescription);

  if (parsed.unknown) {
    warnings.push({
      code: "unknown_equipment_type",
      message: `Could not confidently map equipment type: ${originalDescription}`,
      csvRowNumber,
      severity: "warning",
    });
  }

  const location =
    section === "portable" ? clean(row["Unnamed: 8"]) : clean(row["Unnamed: 18"]);
  const portableNumberOrCapacity =
    section === "portable" ? splitCustomerNumberAndCapacity(row["Unnamed: 7"]) : null;
  const sizeCapacity =
    section === "portable"
      ? portableNumberOrCapacity?.capacity ?? parsed.capacity
      : parsed.capacity;
  const compliance =
    section === "portable" ? clean(row["Unnamed: 16"]) : clean(row["Unnamed: 35"]);
  const manufactureDate = parseDate(
    firstAliasedValue(row, [
      "Manufacture Date",
      "Manufactured Date",
      "Date Manufactured",
      "Cylinder Manufacture Date",
      "MFG Date",
    ])
  );
  const lastPressureTestDate = parseDate(
    section === "portable"
      ? clean(row["Unnamed: 9"]) ??
          firstAliasedValue(row, [
            "Last Pressure Test Date",
            "Pressure Test Date",
            "Last Hydro Test Date",
            "Hydro Test Date",
            "Cylinder Test Date",
          ])
      : firstAliasedValue(row, [
          "Last Pressure Test Date",
          "Pressure Test Date",
          "Last Hydro Test Date",
          "Hydro Test Date",
        ])
  );
  const nextPressureTestDate = parseDate(
    firstAliasedValue(row, [
      "Next Pressure Test Date",
      "Pressure Test Due Date",
      "Next Hydro Test Date",
      "Hydro Test Due Date",
      "Next Cylinder Test Date",
    ])
  );
  const report = job.technicianReport;
  const checklist =
    section === "portable"
      ? mapPortableChecklist(row, report)
      : mapFixedChecklist(row, report, parsed.assetType);
  const defect = buildDefect(row, section, compliance, checklist, report);

  if (!compliance) {
    warnings.push({
      code: "blank_compliance_result",
      message: "Compliance result is blank.",
      csvRowNumber,
      severity: "warning",
    });
  }

  if (!location) {
    warnings.push({
      code: "missing_asset_location",
      message: "Asset location is blank. Asset will be marked unverified.",
      csvRowNumber,
      severity: "warning",
    });
  }

  const idempotencyKey = makeIdempotencyKey({
    legacyZohoJobcardId: job.legacyZohoJobcardId,
    csvRowNumber,
    section,
    location: location ?? "",
    description: originalDescription,
  });

  return {
    csvRowNumber,
    section,
    idempotencyKey,
    legacyZohoJobcardId: job.legacyZohoJobcardId,
    rawRow: row,
    job,
    asset: {
      assetType: parsed.assetType,
      originalDescription,
      sizeCapacity,
      customerAssetNumber: portableNumberOrCapacity?.customerAssetNumber ?? null,
      medium: parsed.medium,
      locationDescription: location,
      manufactureDate,
      lastServiceDate:
        section === "fixed" ? parseDate(clean(row["Unnamed: 19"])) : null,
      lastPressureTestDate,
      nextPressureTestDate,
      importedUnverified: parsed.unknown || !location,
    },
    inspection: {
      assetType: parsed.assetType,
      checklist,
      result: isCompliant(compliance, checklist) ? "pass" : "fail",
      requiresPressureTest: containsPressureTest(compliance),
      requiresRefill: containsAny(`${originalDescription} ${report ?? ""}`, [
        "refill",
        "recharge",
      ]),
      notes: report,
    },
    defect,
    warnings,
  };
}

function parsePortableDescription(description: string): {
  assetType: AssetType;
  capacity: string | null;
  medium: string | null;
  unknown: boolean;
} {
  const text = description.toLowerCase();
  const capacity = description.match(/(\d+(?:\.\d+)?)\s*kg/i)?.[0] ?? null;
  const medium = text.includes("co2") ? "CO2" : text.includes("dcp") ? "DCP" : null;
  if (text.includes("co2") || text.includes("dcp") || text.includes("extinguisher")) {
    return { assetType: "fire_extinguisher", capacity, medium, unknown: false };
  }
  if (text.includes("blanket")) {
    return { assetType: "fire_blanket", capacity: null, medium: null, unknown: false };
  }
  return { assetType: "fire_extinguisher", capacity, medium, unknown: true };
}

const VALID_EXTINGUISHER_CAPACITIES = new Set([
  "1kg",
  "2kg",
  "2.5kg",
  "4.5kg",
  "5kg",
  "6kg",
  "9kg",
  "25kg",
  "50kg",
]);

function splitCustomerNumberAndCapacity(value: string | null | undefined): {
  capacity: string | null;
  customerAssetNumber: string | null;
} {
  const text = clean(value);
  if (!text) return { capacity: null, customerAssetNumber: null };

  const normalizedCapacity = text.toLowerCase().replace(/\s+/g, "");
  if (VALID_EXTINGUISHER_CAPACITIES.has(normalizedCapacity)) {
    return {
      capacity: normalizedCapacity.replace("kg", "kg"),
      customerAssetNumber: null,
    };
  }

  if (/^\d+$/.test(text)) {
    return { capacity: null, customerAssetNumber: text };
  }

  return { capacity: null, customerAssetNumber: text };
}

function parseFixedDescription(description: string): {
  assetType: AssetType;
  capacity: string | null;
  medium: string | null;
  unknown: boolean;
} {
  const text = description.toLowerCase();
  if (text.includes("hose")) {
    return { assetType: "hose_reel", capacity: null, medium: null, unknown: false };
  }
  if (text.includes("hydrant")) {
    return { assetType: "hydrant", capacity: null, medium: null, unknown: false };
  }
  if (text.includes("sign")) {
    return { assetType: "signage", capacity: null, medium: null, unknown: false };
  }
  return { assetType: "fire_detection", capacity: null, medium: null, unknown: true };
}

function mapPortableChecklist(
  row: CsvRow,
  report: string | null
): Record<string, string | boolean | null> {
  return {
    seal_and_pin_intact: yesNo(row["Unnamed: 10"]),
    no_visible_damage_rust_or_corrosion: yesNo(row["Unnamed: 11"]),
    nozzle_free_from_obstruction_or_damage: yesNo(row["Unnamed: 12"]),
    pressure_within_operational_range: yesNo(row["Unnamed: 13"]),
    accessible_and_clearly_marked: yesNo(row["Unnamed: 14"]),
    replacement_parts_used: clean(row["Unnamed: 15"]),
    compliant_result: clean(row["Unnamed: 16"]),
    last_pressure_test_date: parseDate(clean(row["Unnamed: 9"])),
    technician_notes: report,
  };
}

function mapFixedChecklist(
  row: CsvRow,
  report: string | null,
  assetType: AssetType
): Record<string, string | boolean | null> {
  if (assetType === "hydrant") {
    return {
      hydrant_body_condition_ok: yesNo(row["Unnamed: 28"]),
      hydrant_operational_with_good_pressure: yesNo(row["Unnamed: 29"]),
      pressure_reading: clean(row["Unnamed: 30"]),
      valve_opens_and_closes_without_leaks: yesNo(row["Unnamed: 31"]),
      couplings_and_nozzles_functional: yesNo(row["Unnamed: 32"]),
      clearly_marked_and_accessible: yesNo(row["Unnamed: 33"]),
      spares_replaced: clean(row["Unnamed: 34"]),
      compliant_result: clean(row["Unnamed: 35"]),
      technician_notes: report,
    };
  }

  return {
    hose_condition_ok: yesNo(row["Unnamed: 20"]),
    reel_mechanism_ok: yesNo(row["Unnamed: 21"]),
    hose_length_sufficient: yesNo(row["Unnamed: 22"]),
    nozzle_operating_correctly: yesNo(row["Unnamed: 23"]),
    water_flow_pressure_adequate: yesNo(row["Unnamed: 24"]),
    signage_present: yesNo(row["Unnamed: 25"]),
    no_leaks: yesNo(row["Unnamed: 26"]),
    cabinet_accessible_and_intact: yesNo(row["Unnamed: 27"]),
    spares_replaced: clean(row["Unnamed: 34"]),
    compliant_result: clean(row["Unnamed: 35"]),
    technician_notes: report,
  };
}

function yesNo(value: string | null | undefined): boolean | null {
  const text = normalizeText(value);
  if (!text) return null;
  if (["yes", "y", "true", "pass", "ok", "compliant"].includes(text)) return true;
  if (["no", "n", "false", "fail", "not compliant"].includes(text)) return false;
  if (text.includes("pressure testing required")) return false;
  return null;
}

function firstAliasedValue(row: CsvRow, aliases: string[]): string | null {
  const normalizedAliases = aliases.map(normalizeText);
  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.includes(normalizeText(key))) {
      const cleaned = clean(value);
      if (cleaned) return cleaned;
    }
  }
  return null;
}

function isCompliant(
  compliance: string | null,
  checklist: Record<string, string | boolean | null>
): boolean {
  if (containsPressureTest(compliance)) return false;
  const normalized = normalizeText(compliance);
  if (["no", "not compliant", "fail", "failed"].includes(normalized)) return false;
  if (Object.values(checklist).some((value) => value === false)) return false;
  return ["yes", "compliant", "pass", "passed"].includes(normalized);
}

function buildDefect(
  row: CsvRow,
  section: EquipmentSection,
  compliance: string | null,
  checklist: Record<string, string | boolean | null>,
  report: string | null
): ZohoMappedEquipment["defect"] {
  const parts =
    section === "portable" ? clean(row["Unnamed: 15"]) : clean(row["Unnamed: 34"]);
  const rowFailed = !isCompliant(compliance, checklist);
  const hasChecklistFailure = Object.values(checklist).some((value) => value === false);
  const rowSpecificText = [
    compliance,
    parts,
    ...Object.entries(checklist)
      .filter(([, value]) => value === false)
      .map(([key]) => key),
  ]
    .filter(Boolean)
    .join(" ");
  const combined = [
    rowSpecificText,
    report,
  ]
    .filter(Boolean)
    .join(" ");

  // Technician report is job-level text and is repeated across every imported
  // equipment row. Do not let report-only keywords create duplicate defects
  // for rows whose own compliance/checklist/parts data passed.
  const shouldCreate =
    rowFailed ||
    Boolean(parts) ||
    hasChecklistFailure ||
    containsAny(rowSpecificText, [
      "pressure test",
      "pressure testing required",
      "refill",
      "replacement",
      "replaced",
      "damaged",
      "missing",
      "leak",
      "rust",
      "corrosion",
      "not installed",
      "not compliant",
      "repair",
    ]);

  if (!shouldCreate) return null;

  const severity = suggestedSeverity(combined);
  const description = [
    compliance ? `Compliance: ${compliance}` : null,
    parts ? `Parts/spares: ${parts}` : null,
    report ? `Technician report: ${report}` : null,
    Object.entries(checklist)
      .filter(([, value]) => value === false)
      .map(([key]) => key.replace(/_/g, " "))
      .join("; "),
  ]
    .filter(Boolean)
    .join(". ");

  return {
    shouldCreate: true,
    severity,
    description: description || "Imported Zoho inspection indicates non-compliance.",
    recommendedAction: recommendedAction(combined),
  };
}

function suggestedSeverity(text: string): DefectSeverity {
  const normalized = normalizeText(text);
  if (normalized.includes("missing") || normalized.includes("not installed")) {
    return "high";
  }
  if (
    normalized.includes("pressure not") ||
    normalized.includes("operational range") ||
    normalized.includes("leak")
  ) {
    return "high";
  }
  if (
    normalized.includes("pressure testing required") ||
    normalized.includes("rust") ||
    normalized.includes("corrosion") ||
    normalized.includes("damage")
  ) {
    return "medium";
  }
  if (normalized.includes("parts") || normalized.includes("spares")) return "low";
  return "medium";
}

function recommendedAction(text: string): string {
  const normalized = normalizeText(text);
  if (normalized.includes("pressure testing required")) {
    return "Schedule hydro/pressure test and verify unit is safe to remain in service.";
  }
  if (normalized.includes("missing") || normalized.includes("not installed")) {
    return "Install the missing required equipment or signage and update the asset register.";
  }
  if (normalized.includes("leak")) {
    return "Repair leak, re-test equipment and replace parts if needed.";
  }
  if (normalized.includes("rust") || normalized.includes("corrosion")) {
    return "Inspect corrosion severity and replace equipment if structural integrity is affected.";
  }
  if (normalized.includes("refill")) {
    return "Refill/recharge extinguisher and confirm pressure is within operational range.";
  }
  return "Review imported Zoho finding and create remedial work if required.";
}

function containsPressureTest(value: string | null | undefined): boolean {
  return normalizeText(value).includes("pressure testing required");
}

function containsAny(value: string | null | undefined, needles: string[]): boolean {
  const haystack = normalizeText(value);
  return needles.some((needle) => haystack.includes(normalizeText(needle)));
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const text = value.trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const dmy = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function parseDateTime(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  const date = parseDate(value);
  return date ? `${date}T00:00:00.000Z` : null;
}

function makeIdempotencyKey(input: {
  legacyZohoJobcardId: string;
  csvRowNumber: number;
  section: EquipmentSection;
  location: string;
  description: string;
}): string {
  return [
    "zoho",
    normalizeText(input.legacyZohoJobcardId),
    input.csvRowNumber,
    input.section,
    normalizeText(input.location),
    normalizeText(input.description),
  ].join("|");
}

function buildPreviewJobs(equipment: ZohoMappedEquipment[]): ZohoPreviewJob[] {
  const map = new Map<string, ZohoPreviewJob>();

  for (const item of equipment) {
    const existing =
      map.get(item.legacyZohoJobcardId) ??
      ({
        legacyZohoJobcardId: item.legacyZohoJobcardId,
        customerName: item.job.customerName,
        contactName: item.job.contactName,
        date: item.job.date,
        technicianName: item.job.technicianName,
        portableAssets: 0,
        fixedAssets: 0,
        likelyDefects: 0,
        warnings: [],
        status: "ready",
      } satisfies ZohoPreviewJob);

    if (item.section === "portable") existing.portableAssets++;
    if (item.section === "fixed") existing.fixedAssets++;
    if (item.defect?.shouldCreate) existing.likelyDefects++;
    existing.warnings.push(...item.warnings);
    if (existing.warnings.some((w) => w.severity === "error")) {
      existing.status = "skipped";
    } else if (existing.warnings.length > 0) {
      existing.status = "warning";
    }
    map.set(item.legacyZohoJobcardId, existing);
  }

  return [...map.values()].sort((a, b) =>
    a.legacyZohoJobcardId.localeCompare(b.legacyZohoJobcardId)
  );
}

export function jobTypeForImportedEquipment(
  equipment: ZohoMappedEquipment[]
): JobType {
  if (equipment.some((e) => e.section === "fixed")) return "inspection";
  if (equipment.some((e) => e.inspection.requiresPressureTest)) return "pressure_test";
  if (equipment.some((e) => e.inspection.requiresRefill)) return "refill";
  return "annual_service";
}

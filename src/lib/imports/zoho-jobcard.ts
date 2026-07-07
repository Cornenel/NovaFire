import type {
  AssetType,
  DefectSeverity,
  InspectionResult,
  JobType,
} from "@/lib/fsm/types";

export const ZOHO_IMPORT_SOURCE = "zoho_import";

/**
 * Zoho Jobcard CSV column layout (Excel letters A–AR, 44 columns, 0-based indices).
 *
 * A–O  (0–14)  Portable fire equipment serviced
 * P    (15)     Replacement parts used on portable device
 * Q    (16)     Additional service requirements
 * R–AH (17–33) Fixed fire equipment (hose reels, hydrants, etc.)
 * AI   (34)     Spares replaced on fixed equipment
 * AJ   (35)     Device compliance (portable and fixed)
 * AK   (36)     Next service date
 * AL   (37)     Marketing opt-in
 * AM   (38)     Customer name
 * AN   (39)     Technician name
 * AO   (40)     SAQCC number
 * AP   (41)     Time added
 * AQ   (42)     Submitter location
 * AR   (43)     Technician notes / report
 *
 * Some exports prepend Unique ID / Date / contact columns (A–G), shifting portable
 * fields to H–. The parser detects that legacy layout automatically.
 */

export const ZOHO_COL = {
  PORTABLE_START: 0,
  PORTABLE_END: 14,
  REPLACEMENT_PARTS: 15,
  ADDITIONAL_SERVICE: 16,
  FIXED_START: 17,
  FIXED_END: 33,
  FIXED_SPARES: 34,
  DEVICE_COMPLIANCE: 35,
  NEXT_SERVICE_DATE: 36,
  OPT_IN_MARKETING: 37,
  CUSTOMER_NAME: 38,
  TECHNICIAN_NAME: 39,
  SAQCC_NUMBER: 40,
  ADDED_TIME: 41,
  SUBMITTERS_LOCATION: 42,
  TECHNICIAN_NOTES: 43,
} as const;

const LEGACY_JOB_PREFIX_COLUMNS = 7;

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
  "Portable Fire Equipment",
  "Fixed Fire Equipment",
  "Technicians Name",
  "SAQCC Number",
] as const;

export type ZohoLayout = "letter" | "legacy";

export interface ZohoColumnMap {
  layout: ZohoLayout;
  portableDevice: number;
  portableWeight: number;
  portableLocation: number;
  portableLastPressureTest: number;
  portableCheckIndices: number[];
  replacementParts: number;
  additionalService: number;
  fixedDevice: number;
  fixedLocation: number;
  fixedLastService: number;
  fixedHoseCheckIndices: number[];
  fixedHydrantCheckIndices: number[];
  fixedSpares: number;
  deviceCompliance: number;
  nextServiceDate: number;
  optInMarketing: number;
  customerName: number;
  technicianName: number;
  saqccNumber: number;
  addedTime: number;
  submittersLocation: number;
  technicianNotes: number;
  uniqueId: number | null;
  jobDate: number | null;
  contactName: number | null;
  phone: number | null;
  email: number | null;
}

interface JobState {
  uniqueId?: string;
  date?: string;
  customerName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  nextServiceDate?: string;
  technicianName?: string;
  saqccNumber?: string;
  addedTime?: string;
  submittersLocation?: string;
  technicianReport?: string;
  marketingOptIn?: string;
}

export function buildZohoColumnMap(headers: string[]): ZohoColumnMap {
  const legacy =
    headers[0] === "Unique ID" ||
    (headers.length > 7 && headers[7] === "Portable Fire Equipment");

  const portableOffset = legacy ? LEGACY_JOB_PREFIX_COLUMNS : 0;
  const fixedOffset = legacy ? 1 : 0;

  return {
    layout: legacy ? "legacy" : "letter",
    portableDevice: portableOffset + ZOHO_COL.PORTABLE_START,
    portableWeight: portableOffset + 1,
    portableLocation: portableOffset + 2,
    portableLastPressureTest: portableOffset + 3,
    portableCheckIndices: [4, 5, 6, 7, 8].map((i) => portableOffset + i),
    replacementParts: ZOHO_COL.REPLACEMENT_PARTS,
    additionalService: ZOHO_COL.ADDITIONAL_SERVICE,
    fixedDevice: ZOHO_COL.FIXED_START + fixedOffset,
    fixedLocation: ZOHO_COL.FIXED_START + fixedOffset + 1,
    fixedLastService: ZOHO_COL.FIXED_START + fixedOffset + 2,
    fixedHoseCheckIndices: [3, 4, 5, 6, 7, 8, 9].map(
      (i) => ZOHO_COL.FIXED_START + fixedOffset + i
    ),
    fixedHydrantCheckIndices: [10, 11, 12, 13, 14, 15].map(
      (i) => ZOHO_COL.FIXED_START + fixedOffset + i
    ),
    fixedSpares: ZOHO_COL.FIXED_SPARES,
    deviceCompliance: ZOHO_COL.DEVICE_COMPLIANCE,
    nextServiceDate: ZOHO_COL.NEXT_SERVICE_DATE,
    optInMarketing: ZOHO_COL.OPT_IN_MARKETING,
    customerName: ZOHO_COL.CUSTOMER_NAME,
    technicianName: ZOHO_COL.TECHNICIAN_NAME,
    saqccNumber: ZOHO_COL.SAQCC_NUMBER,
    addedTime: ZOHO_COL.ADDED_TIME,
    submittersLocation: ZOHO_COL.SUBMITTERS_LOCATION,
    technicianNotes: ZOHO_COL.TECHNICIAN_NOTES,
    uniqueId: legacy ? 0 : headerIndex(headers, "Unique ID"),
    jobDate: legacy ? 1 : headerIndex(headers, "Date"),
    contactName: legacy ? 3 : headerIndex(headers, "Contact Name"),
    phone: legacy ? 4 : headerIndex(headers, "Phone"),
    email: legacy ? 5 : headerIndex(headers, "Email"),
  };
}

function headerIndex(headers: string[], name: string): number | null {
  const index = headers.indexOf(name);
  return index >= 0 ? index : null;
}

export function getZohoCell(
  row: Record<string, string>,
  headers: string[],
  index: number | null | undefined
): string | null {
  if (index === null || index === undefined || index < 0) return null;
  const key = headers[index];
  if (!key) return null;
  return clean(row[key]);
}

function getComplianceCell(
  row: CsvRow,
  headers: string[]
): string | null {
  return (
    getZohoCell(row, headers, ZOHO_COL.DEVICE_COMPLIANCE) ??
    clean(row["Unnamed: 34"]) ??
    clean(row["Unnamed: 35"])
  );
}

function getNextServiceCell(
  row: CsvRow,
  headers: string[],
  columnMap: ZohoColumnMap
): string | null {
  return (
    getZohoCell(row, headers, columnMap.nextServiceDate) ??
    clean(row["Next Service Date"]) ??
    clean(row["Unnamed: 35"])
  );
}

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
  const columnMap = buildZohoColumnMap(headers);
  const warnings: ZohoWarning[] = [];
  for (const h of REQUIRED_HEADERS) {
    if (!headers.includes(h) && columnMap.layout === "legacy") {
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
      message: `Expected 44 columns (A–AR) but found ${headers.length}. Import will preserve raw rows and warn on unmapped fields.`,
      severity: "warning",
    });
  }

  const state: JobState = {};
  const seenKeys = new Set<string>();
  const equipment: ZohoMappedEquipment[] = [];
  let skippedRows = 0;
  let duplicateRows = 0;

  for (let i = 1; i < rows.length; i++) {
    const csvRowNumber = i + 1;
    const row = rowToObject(headers, rows[i]);
    if (isBlankRow(row) || isQuestionLabelRow(row, columnMap, headers)) {
      skippedRows++;
      continue;
    }

    mergeJobStateFromRow(row, headers, columnMap, state);

    const rowWarnings: ZohoWarning[] = [];
    const job = mapJob(state, columnMap, csvRowNumber, rowWarnings);
    const sections: EquipmentSection[] = [];
    if (hasPortableEquipment(row, columnMap, headers)) sections.push("portable");
    if (hasFixedEquipment(row, columnMap, headers)) sections.push("fixed");

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
      const mapped = mapEquipment(
        row,
        headers,
        columnMap,
        csvRowNumber,
        section,
        job
      );
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

function isQuestionLabelRow(
  row: CsvRow,
  columnMap: ZohoColumnMap,
  headers: string[]
): boolean {
  const values = Object.values(row).join(" ").toLowerCase();
  const noJobData =
    !getZohoCell(row, headers, columnMap.uniqueId) &&
    !getZohoCell(row, headers, columnMap.customerName) &&
    !clean(row["Customer Name"]);
  return (
    noJobData &&
    (values.includes("device weight") ||
      values.includes("is the seal") ||
      values.includes("hose in good condition") ||
      values.includes("pressure reading"))
  );
}

function mergeJobStateFromRow(
  row: CsvRow,
  headers: string[],
  columnMap: ZohoColumnMap,
  state: JobState
): void {
  const assign = (key: keyof JobState, index: number | null | undefined) => {
    const value = getZohoCell(row, headers, index);
    if (value) state[key] = value;
  };

  for (const field of JOB_FIELDS) {
    const value = clean(row[field]);
    if (!value) continue;
    switch (field) {
      case "Unique ID":
        state.uniqueId = value;
        break;
      case "Date":
        state.date = value;
        break;
      case "Customer Name":
      case "Customer Name.1":
        state.customerName = value;
        break;
      case "Contact Name":
        state.contactName = value;
        break;
      case "Phone":
        state.phone = value;
        break;
      case "Email":
        state.email = value;
        break;
      case "Next Service Date":
        state.nextServiceDate = value;
        break;
      case "Technicians Name":
        state.technicianName = value;
        break;
      case "SAQCC Number":
        state.saqccNumber = value;
        break;
      case "Added Time":
        state.addedTime = value;
        break;
      case "Submitters Location":
        state.submittersLocation = value;
        break;
      case "Technicians Report":
        state.technicianReport = value;
        break;
      default:
        break;
    }
  }

  assign("uniqueId", columnMap.uniqueId);
  assign("date", columnMap.jobDate);
  assign("contactName", columnMap.contactName);
  assign("phone", columnMap.phone);
  assign("email", columnMap.email);
  assign("customerName", columnMap.customerName);
  assign("nextServiceDate", columnMap.nextServiceDate);
  const rowNextService = getNextServiceCell(row, headers, columnMap);
  if (rowNextService) state.nextServiceDate = rowNextService;
  assign("technicianName", columnMap.technicianName);
  assign("saqccNumber", columnMap.saqccNumber);
  assign("addedTime", columnMap.addedTime);
  assign("submittersLocation", columnMap.submittersLocation);
  assign("technicianReport", columnMap.technicianNotes);
  assign("marketingOptIn", columnMap.optInMarketing);
}

function hasPortableEquipment(
  row: CsvRow,
  columnMap: ZohoColumnMap,
  headers: string[]
): boolean {
  if (getZohoCell(row, headers, columnMap.portableDevice)) return true;
  if (getZohoCell(row, headers, columnMap.portableWeight)) return true;
  if (getZohoCell(row, headers, columnMap.portableLocation)) return true;
  return Boolean(clean(row["Portable Fire Equipment"]));
}

function hasFixedEquipment(
  row: CsvRow,
  columnMap: ZohoColumnMap,
  headers: string[]
): boolean {
  if (getZohoCell(row, headers, columnMap.fixedDevice)) return true;
  if (getZohoCell(row, headers, columnMap.fixedLocation)) return true;
  if (getZohoCell(row, headers, columnMap.fixedLastService)) return true;
  return Boolean(clean(row["Fixed Fire Equipment"]));
}

function mapJob(
  state: JobState,
  columnMap: ZohoColumnMap,
  csvRowNumber: number,
  warnings: ZohoWarning[]
): ZohoMappedJob {
  const uniqueId =
    clean(state.uniqueId) ??
    deriveLegacyJobcardId({
      addedTime: state.addedTime,
      customerName: state.customerName,
      technicianName: state.technicianName,
      submittersLocation: state.submittersLocation,
      date: state.date,
      csvRowNumber,
    });
  const customerName = clean(state.customerName);
  const email = clean(state.email);

  if (!state.uniqueId && columnMap.layout === "legacy") {
    warnings.push({
      code: "missing_unique_id",
      message: "Missing Zoho Unique ID after forward-fill.",
      csvRowNumber,
      severity: "error",
    });
  } else if (!state.uniqueId && columnMap.layout === "letter") {
    warnings.push({
      code: "derived_job_id",
      message: `Derived job id ${uniqueId} from customer, technician and time added (column AP).`,
      csvRowNumber,
      severity: "info",
    });
  }
  if (!customerName) {
    warnings.push({
      code: "missing_customer_name",
      message: "Missing customer name after forward-fill (column AM).",
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

  const date = parseDate(clean(state.date));
  if (clean(state.date) && !date) {
    warnings.push({
      code: "invalid_date",
      message: `Could not parse job date: ${state.date}`,
      csvRowNumber,
      severity: "warning",
    });
  }

  const nextServiceDate = parseDate(clean(state.nextServiceDate));
  if (clean(state.nextServiceDate) && !nextServiceDate) {
    warnings.push({
      code: "invalid_next_service_date",
      message: `Could not parse next service date (column AK): ${state.nextServiceDate}`,
      csvRowNumber,
      severity: "warning",
    });
  }

  return {
    legacyZohoJobcardId: uniqueId,
    date,
    addedTime: parseDateTime(clean(state.addedTime)) ?? date,
    customerName,
    contactName: clean(state.contactName),
    phone: clean(state.phone),
    email: normalizeEmail(email) ?? email ?? null,
    nextServiceDate,
    technicianName: clean(state.technicianName),
    saqccNumber: clean(state.saqccNumber),
    submittersLocation: clean(state.submittersLocation),
    technicianReport: clean(state.technicianReport),
  };
}

function deriveLegacyJobcardId(input: {
  addedTime?: string;
  customerName?: string;
  technicianName?: string;
  submittersLocation?: string;
  date?: string;
  csvRowNumber: number;
}): string {
  const parts = [
    input.addedTime,
    input.customerName,
    input.technicianName,
    input.submittersLocation,
    input.date,
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);
  if (parts.length > 0) {
    return `zoho-${parts.join("-").slice(0, 120)}`;
  }
  return `missing-${input.csvRowNumber}`;
}

function mapEquipment(
  row: CsvRow,
  headers: string[],
  columnMap: ZohoColumnMap,
  csvRowNumber: number,
  section: EquipmentSection,
  job: ZohoMappedJob
): ZohoMappedEquipment {
  const warnings: ZohoWarning[] = [];
  const rawDescription =
    section === "portable"
      ? getZohoCell(row, headers, columnMap.portableDevice) ??
        clean(row["Portable Fire Equipment"])
      : getZohoCell(row, headers, columnMap.fixedDevice) ??
        clean(row["Fixed Fire Equipment"]);
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
    section === "portable"
      ? getZohoCell(row, headers, columnMap.portableLocation)
      : getZohoCell(row, headers, columnMap.fixedLocation);
  const portableNumberOrCapacity =
    section === "portable"
      ? splitCustomerNumberAndCapacity(
          getZohoCell(row, headers, columnMap.portableWeight)
        )
      : null;
  const sizeCapacity =
    section === "portable"
      ? portableNumberOrCapacity?.capacity ?? parsed.capacity
      : parsed.capacity;
  const compliance = getComplianceCell(row, headers);
  const additionalService = getZohoCell(row, headers, columnMap.additionalService);
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
      ? getZohoCell(row, headers, columnMap.portableLastPressureTest) ??
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
      ? mapPortableChecklist(row, headers, columnMap, report, additionalService)
      : mapFixedChecklist(row, headers, columnMap, report, parsed.assetType);
  const defect = buildDefect(
    row,
    headers,
    columnMap,
    section,
    compliance,
    checklist,
    report,
    additionalService
  );

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
        section === "fixed"
          ? parseDate(getZohoCell(row, headers, columnMap.fixedLastService))
          : null,
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
  headers: string[],
  columnMap: ZohoColumnMap,
  report: string | null,
  additionalService: string | null
): Record<string, string | boolean | null> {
  const [seal, damage, nozzle, pressure, accessible] =
    columnMap.portableCheckIndices.map((index) => getZohoCell(row, headers, index));
  return {
    seal_and_pin_intact: yesNo(seal),
    no_visible_damage_rust_or_corrosion: yesNo(damage),
    nozzle_free_from_obstruction_or_damage: yesNo(nozzle),
    pressure_within_operational_range: yesNo(pressure),
    accessible_and_clearly_marked: yesNo(accessible),
    replacement_parts_used: getZohoCell(row, headers, columnMap.replacementParts),
    additional_service_requirements: additionalService,
    compliant_result: getComplianceCell(row, headers),
    last_pressure_test_date: parseDate(
      getZohoCell(row, headers, columnMap.portableLastPressureTest)
    ),
    technician_notes: report,
  };
}

function mapFixedChecklist(
  row: CsvRow,
  headers: string[],
  columnMap: ZohoColumnMap,
  report: string | null,
  assetType: AssetType
): Record<string, string | boolean | null> {
  const cellAt = (index: number) => getZohoCell(row, headers, index);
  if (assetType === "hydrant") {
    const [body, operational, reading, valve, couplings, marked] =
      columnMap.fixedHydrantCheckIndices;
    return {
      hydrant_body_condition_ok: yesNo(cellAt(body)),
      hydrant_operational_with_good_pressure: yesNo(cellAt(operational)),
      pressure_reading: cellAt(reading),
      valve_opens_and_closes_without_leaks: yesNo(cellAt(valve)),
      couplings_and_nozzles_functional: yesNo(cellAt(couplings)),
      clearly_marked_and_accessible: yesNo(cellAt(marked)),
      spares_replaced: cellAt(columnMap.fixedSpares),
      additional_service_requirements: cellAt(columnMap.additionalService),
      compliant_result: getComplianceCell(row, headers),
      technician_notes: report,
    };
  }

  const [
    hose,
    reel,
    hoseLength,
    nozzle,
    waterFlow,
    signage,
    leaks,
    cabinet,
  ] = columnMap.fixedHoseCheckIndices;
  return {
    hose_condition_ok: yesNo(cellAt(hose)),
    reel_mechanism_ok: yesNo(cellAt(reel)),
    hose_length_sufficient: yesNo(cellAt(hoseLength)),
    nozzle_operating_correctly: yesNo(cellAt(nozzle)),
    water_flow_pressure_adequate: yesNo(cellAt(waterFlow)),
    signage_present: yesNo(cellAt(signage)),
    no_leaks: yesNo(cellAt(leaks)),
    cabinet_accessible_and_intact: yesNo(cellAt(cabinet)),
    spares_replaced: cellAt(columnMap.fixedSpares),
    additional_service_requirements: cellAt(columnMap.additionalService),
    compliant_result: getComplianceCell(row, headers),
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
  headers: string[],
  columnMap: ZohoColumnMap,
  section: EquipmentSection,
  compliance: string | null,
  checklist: Record<string, string | boolean | null>,
  report: string | null,
  additionalService: string | null
): ZohoMappedEquipment["defect"] {
  const parts =
    section === "portable"
      ? getZohoCell(row, headers, columnMap.replacementParts)
      : getZohoCell(row, headers, columnMap.fixedSpares);
  const meaningfulParts = isMeaningfulPartsOrSpares(parts);
  const rowFailed = !isCompliant(compliance, checklist);
  const hasChecklistFailure = Object.values(checklist).some((value) => value === false);
  const rowSpecificText = [
    compliance,
    meaningfulParts ? parts : null,
    additionalService,
    ...Object.entries(checklist)
      .filter(([, value]) => value === false)
      .map(([key]) => key),
  ]
    .filter(Boolean)
    .join(" ");
  const combined = [rowSpecificText, report].filter(Boolean).join(" ");

  // Technician report is job-level text and is repeated across every imported
  // equipment row. Do not let report-only keywords create duplicate defects
  // for rows whose own compliance/checklist/parts data passed.
  const shouldCreate =
    rowFailed ||
    meaningfulParts ||
    isMeaningfulAdditionalService(additionalService) ||
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
    meaningfulParts ? `Parts/spares: ${parts}` : null,
    additionalService ? `Additional service: ${additionalService}` : null,
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

/** Column P / AI should list actual parts – not yes/no checklist answers. */
function isMeaningfulPartsOrSpares(value: string | null | undefined): boolean {
  if (!value) return false;
  const text = normalizeText(value);
  if (!text) return false;
  if (["yes", "y", "no", "n", "true", "false", "pass", "fail", "ok", "compliant"].includes(text)) {
    return false;
  }
  return true;
}

function isMeaningfulAdditionalService(value: string | null | undefined): boolean {
  if (!value) return false;
  const text = normalizeText(value);
  if (!text) return false;
  if (["yes", "y", "no", "n", "-"].includes(text)) return false;
  return true;
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

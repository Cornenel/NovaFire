import type {
  AssetType,
  DefectSeverity,
  InspectionResult,
  JobType,
} from "@/lib/fsm/types";

export const ZOHO_IMPORT_SOURCE = "zoho_import";
export const ZOHO_FORMS_IMPORT_LABEL = "Zoho Forms Import";
export const ZOHO_ANNUAL_SERVICE_CATEGORY = "Annual Fire Equipment Service";
export const PRESSURE_TEST_DEFECT_TYPE = "Pressure Test Required";
export const PRESSURE_TEST_QUOTE_GROUP_TYPE = "Pressure Testing";
export const PRESSURE_TEST_QUOTE_REASON =
  "Pressure testing required for multiple devices";

/**
 * Historical Zoho Jobcard CSV importer.
 *
 * Migrates completed technician jobcards from Zoho Forms into permanent asset
 * service history. Annual service completion and additional follow-up work
 * (e.g. pressure testing) are modelled separately — a passed annual service
 * may still require a quoted pressure test workshop service.
 */

/**
 * Zoho Jobcard CSV column layout (Excel letters A–AR, 44 columns, 0-based indices).
 *
 * Hierarchical export (Unique ID at A, portable at G / index 6):
 * A  (0)  Unique ID / Jobcard ID
 * B  (1)  Date
 * C–F(2–5) Customer details
 * G–Q(6–16) Portable fire equipment (annual result at Q / 16)
 * R–AH(17–33) Fixed fire equipment
 * AI (34) Fixed spares replaced
 * AJ (35) Fixed device compliance
 * AK–AR(36–43) Jobcard footer / visit fields
 *
 * Legacy exports shift portable to H (index 7) with the same footer columns.
 * Letter-only exports start portable at A (index 0) with no job prefix columns.
 */

export const ZOHO_COL = {
  PORTABLE_START: 0,
  PORTABLE_END: 14,
  REPLACEMENT_PARTS: 15,
  ANNUAL_SERVICE_RESULT: 16,
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
const HIERARCHICAL_PORTABLE_START = 6;
/** Zoho hierarchical exports commonly omit optional footer columns AP–AR. */
const HIERARCHICAL_MIN_COLUMNS = 42;

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

export type ZohoLayout = "hierarchical" | "legacy" | "letter";

export interface ZohoColumnMap {
  layout: ZohoLayout;
  portableDevice: number;
  portableWeight: number;
  portableLocation: number;
  portableLastPressureTest: number;
  portableCheckIndices: number[];
  replacementParts: number;
  annualServiceResult: number | null;
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
  /** Annual service result from the first portable row on this jobcard. */
  portableComplianceResult?: string | null;
}

export interface ParsedPortableDevice {
  assetCategory: string;
  deviceType: string;
  deviceSize: string | null;
  agentType: string | null;
  serviceType: string | null;
  assetType: AssetType;
  capacity: string | null;
  medium: string | null;
  unknown: boolean;
  parseError: string | null;
}

export interface AnnualServiceOutcome {
  annualServiceCompleted: boolean;
  annualServiceCompliant: boolean;
  pressureTestRequired: boolean;
  additionalWorkRequired: boolean;
  additionalWorkType: string | null;
  quoteRequired: boolean;
  quoteReason: string | null;
  followUpRequired: boolean;
  followUpService: string | null;
  assetStatus: string;
  inspectionPass: boolean;
}

export interface FollowUpWork {
  shouldCreate: boolean;
  quoteRequired: boolean;
  quoteReason: string | null;
  additionalWorkType: string | null;
  followUpService: string | null;
  defectType: string;
  description: string;
  recommendedAction: string;
}

export interface ServicePartsUsed {
  replacementPartsUsedRaw: string | null;
  servicePartsUsed: string[];
  partsUsed: boolean;
}

export function buildZohoColumnMap(
  headers: string[],
  options?: { hierarchicalExport?: boolean }
): ZohoColumnMap {
  const hierarchical =
    options?.hierarchicalExport === true ||
    (headers[0] === "Unique ID" && headers[7] !== "Portable Fire Equipment");
  const legacy =
    !hierarchical &&
    (headers[0] === "Unique ID" ||
      (headers.length > 7 && headers[7] === "Portable Fire Equipment"));

  const portableOffset = hierarchical
    ? HIERARCHICAL_PORTABLE_START
    : legacy
      ? LEGACY_JOB_PREFIX_COLUMNS
      : 0;
  const fixedOffset = legacy || hierarchical ? 0 : 0;

  return {
    layout: hierarchical ? "hierarchical" : legacy ? "legacy" : "letter",
    portableDevice: portableOffset + (hierarchical ? 0 : legacy ? 0 : ZOHO_COL.PORTABLE_START),
    portableWeight: portableOffset + 1,
    portableLocation: portableOffset + 2,
    portableLastPressureTest: portableOffset + 3,
    portableCheckIndices: [4, 5, 6, 7, 8].map((i) => portableOffset + i),
    replacementParts: ZOHO_COL.REPLACEMENT_PARTS,
    annualServiceResult: hierarchical ? ZOHO_COL.ANNUAL_SERVICE_RESULT : null,
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
    customerName: hierarchical ? 2 : ZOHO_COL.CUSTOMER_NAME,
    technicianName: ZOHO_COL.TECHNICIAN_NAME,
    saqccNumber: ZOHO_COL.SAQCC_NUMBER,
    addedTime: ZOHO_COL.ADDED_TIME,
    submittersLocation: ZOHO_COL.SUBMITTERS_LOCATION,
    technicianNotes: ZOHO_COL.TECHNICIAN_NOTES,
    uniqueId: hierarchical || legacy ? 0 : headerIndex(headers, "Unique ID"),
    jobDate: hierarchical || legacy ? 1 : headerIndex(headers, "Date"),
    contactName: hierarchical ? 3 : legacy ? 3 : headerIndex(headers, "Contact Name"),
    phone: hierarchical ? 4 : legacy ? 4 : headerIndex(headers, "Phone"),
    email: hierarchical ? 5 : legacy ? 5 : headerIndex(headers, "Email"),
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

function getPortableComplianceCell(
  row: CsvRow,
  headers: string[],
  columnMap: ZohoColumnMap,
  rawCells?: string[]
): string | null {
  return resolvePortableCompliance(row, headers, columnMap, rawCells ?? [], null);
}

export function resolvePortableCompliance(
  row: CsvRow,
  headers: string[],
  columnMap: ZohoColumnMap,
  rawCells: string[],
  inherited: string | null | undefined
): string | null {
  const annualIndex = columnMap.annualServiceResult ?? ZOHO_COL.ANNUAL_SERVICE_RESULT;
  const fromAnnualColumn =
    getZohoCell(row, headers, columnMap.annualServiceResult) ??
    getCellAtIndex(rawCells, annualIndex) ??
    getCellAtIndex(rawCells, ZOHO_COL.ANNUAL_SERVICE_RESULT) ??
    firstAliasedValue(row, [
      "Annual Service Result",
      "Annual Service Completed",
      "Compliance Result",
      "Was the Annual Service Completed",
    ]);

  if (fromAnnualColumn) return fromAnnualColumn;

  // Legacy flat exports store portable annual result in footer compliance columns.
  if (columnMap.layout !== "hierarchical") {
    const fromFooter = getComplianceCell(row, headers);
    if (fromFooter) return fromFooter;
  }

  return inherited ?? null;
}

function getFixedComplianceCell(
  row: CsvRow,
  headers: string[],
  rawCells?: string[]
): string | null {
  return (
    getComplianceCell(row, headers) ??
    (rawCells ? getCellAtIndex(rawCells, ZOHO_COL.DEVICE_COMPLIANCE) : null)
  );
}

function getComplianceCell(row: CsvRow, headers: string[]): string | null {
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
  for (const candidate of [
    getZohoCell(row, headers, columnMap.nextServiceDate),
    clean(row["Next Service Date"]),
    clean(row["Unnamed: 35"]),
  ]) {
    if (candidate && isLikelyDateValue(candidate)) return candidate;
  }
  return null;
}

function isLikelyDateValue(value: string | null | undefined): boolean {
  const text = clean(value);
  if (!text) return false;
  const normalized = normalizeText(text);
  if (
    [
      "yes",
      "y",
      "no",
      "n",
      "true",
      "false",
      "pass",
      "fail",
      "ok",
      "compliant",
      "not compliant",
    ].includes(normalized)
  ) {
    return false;
  }
  if (
    normalized.includes("pressure test") ||
    normalized.includes("pressure testing")
  ) {
    return false;
  }
  return true;
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
  parsedDevice: ParsedPortableDevice | null;
  annualService: AnnualServiceOutcome | null;
  partsUsed: ServicePartsUsed | null;
  followUp: FollowUpWork | null;
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
    checklist: Record<string, string | boolean | string[] | null>;
    result: InspectionResult;
    requiresPressureTest: boolean;
    requiresRefill: boolean;
    notes: string | null;
  };
  defect: {
    shouldCreate: boolean;
    quoteRequired: boolean;
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

export interface ZohoImportValidation {
  jobcards_imported: number;
  assets_imported: number;
  annual_services_completed: number;
  pressure_tests_required: number;
  quotes_required: number;
  parts_used: number;
  duplicate_records_skipped: number;
  import_errors: ZohoWarning[];
  /** Records actually written on confirm import */
  parts_used_records_created: number;
  quotes_required_records_created: number;
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
  validation: ZohoImportValidation;
  summary: {
    detectedJobs: number;
    portableAssets: number;
    fixedAssets: number;
    likelyDefects: number;
    readyEquipmentRows: number;
  };
}

type CsvRow = Record<string, string>;

interface CsvStructure {
  headerRowIndex: number;
  dataStartIndex: number;
  sectionHeaderSkipped: boolean;
}

function detectCsvStructure(rows: string[][]): CsvStructure {
  if (rows.length >= 2 && rows[1]?.[0]?.trim() === "Unique ID") {
    return { headerRowIndex: 1, dataStartIndex: 2, sectionHeaderSkipped: true };
  }
  return { headerRowIndex: 0, dataStartIndex: 1, sectionHeaderSkipped: false };
}

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

  const structure = detectCsvStructure(rows);
  const rawHeaders = rows[structure.headerRowIndex].map((h) => h.trim());
  const headers = makeUniqueHeaders(rawHeaders);
  const columnMap = buildZohoColumnMap(headers, {
    hierarchicalExport: structure.sectionHeaderSkipped,
  });
  const warnings: ZohoWarning[] = [];

  if (structure.sectionHeaderSkipped) {
    warnings.push({
      code: "section_header_skipped",
      message: "Skipped row 1 section header row; row 2 used as field headers.",
      severity: "info",
    });
  }

  for (const h of REQUIRED_HEADERS) {
    if (!headers.includes(h) && columnMap.layout !== "letter") {
      warnings.push({
        code: "missing_header",
        message: `Expected header "${h}" was not found.`,
        severity: "warning",
      });
    }
  }
  if (headers.length < minimumColumnsForLayout(columnMap.layout)) {
    warnings.push({
      code: "column_count",
      message: `Expected at least ${minimumColumnsForLayout(columnMap.layout)} columns for ${columnMap.layout} Zoho export but found ${headers.length}. Import will preserve raw rows and warn on unmapped fields.`,
      severity: "warning",
    });
  }

  let currentJobcard: JobState | null = null;
  const seenKeys = new Set<string>();
  const equipment: ZohoMappedEquipment[] = [];
  let skippedRows = structure.sectionHeaderSkipped ? 1 : 0;
  let duplicateRows = 0;

  for (let i = structure.dataStartIndex; i < rows.length; i++) {
    const csvRowNumber = i + 1;
    const rawCells = padCsvRow(rows[i], headers.length);
    const row = rowToObject(headers, rawCells);
    if (isBlankRow(row)) {
      skippedRows++;
      continue;
    }
    if (isQuestionLabelRow(row, columnMap, headers)) {
      skippedRows++;
      continue;
    }

    const uniqueIdOnRow = getZohoCell(row, headers, columnMap.uniqueId);
    const startsNewJobcard = Boolean(uniqueIdOnRow);
    const letterLayoutJobRow =
      columnMap.layout === "letter" &&
      !startsNewJobcard &&
      hasLetterLayoutJobFields(row, headers, columnMap);

    if (startsNewJobcard) {
      currentJobcard = buildJobStateFromRow(row, headers, columnMap);
      currentJobcard.portableComplianceResult = null;
    } else if (letterLayoutJobRow) {
      currentJobcard = buildJobStateFromRow(row, headers, columnMap);
      if (!currentJobcard.uniqueId) {
        currentJobcard.uniqueId = deriveLegacyJobcardId({
          addedTime: currentJobcard.addedTime,
          customerName: currentJobcard.customerName,
          technicianName: currentJobcard.technicianName,
          submittersLocation: currentJobcard.submittersLocation,
          date: currentJobcard.date,
          csvRowNumber,
        });
      }
    } else {
      if (!currentJobcard) {
        warnings.push({
          code: "orphan_asset_row",
          message:
            "Asset/device row appeared before any Jobcard row with a Unique ID.",
          csvRowNumber,
          severity: "error",
        });
        continue;
      }
    }

    if (!currentJobcard?.uniqueId) {
      warnings.push({
        code: "missing_unique_id",
        message: "Jobcard row is missing required Unique ID (column A).",
        csvRowNumber,
        severity: "error",
      });
      continue;
    }

    const rowWarnings: ZohoWarning[] = [];
    const job = mapJob(
      currentJobcard,
      columnMap,
      csvRowNumber,
      rowWarnings,
      startsNewJobcard || letterLayoutJobRow
    );
    const sections: EquipmentSection[] = [];
    if (hasPortableEquipment(row, columnMap, headers)) sections.push("portable");
    if (hasFixedEquipment(row, columnMap, headers)) sections.push("fixed");

    if (sections.length === 0) {
      if (!startsNewJobcard) {
        skippedRows++;
        warnings.push({
          code: "row_skipped",
          message: "Child row contains no portable or fixed equipment data.",
          csvRowNumber,
          severity: "info",
        });
      }
      continue;
    }

    for (const section of sections) {
      let portableCompliance: string | null | undefined;
      if (section === "portable" && currentJobcard) {
        portableCompliance = resolvePortableCompliance(
          row,
          headers,
          columnMap,
          rawCells,
          currentJobcard.portableComplianceResult
        );
        if (portableCompliance) {
          currentJobcard.portableComplianceResult = portableCompliance;
        }
      }

      const mapped = mapEquipment(
        row,
        headers,
        columnMap,
        csvRowNumber,
        section,
        job,
        rawCells,
        portableCompliance
      );
      mapped.warnings.unshift(...rowWarnings);
      if (seenKeys.has(mapped.idempotencyKey)) {
        duplicateRows++;
        mapped.warnings.push({
          code: "duplicate_row",
          message: "Duplicate equipment import fingerprint detected in this CSV.",
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

  const validation = buildImportValidation(equipment, duplicateRows, allWarnings);

  assertNoFatalParseErrors(allWarnings);

  return {
    headers,
    totalCsvRows: Math.max(0, rows.length - structure.headerRowIndex - 1),
    skippedRows,
    duplicateRows,
    warningRows,
    equipment,
    jobs,
    warnings: allWarnings,
    validation,
    summary: {
      detectedJobs: jobs.length,
      portableAssets: equipment.filter((e) => e.section === "portable").length,
      fixedAssets: equipment.filter((e) => e.section === "fixed").length,
      likelyDefects: equipment.filter((e) => e.defect?.shouldCreate).length,
      readyEquipmentRows: equipment.length,
    },
  };
}

function assertNoFatalParseErrors(warnings: ZohoWarning[]): void {
  const fatal = warnings.filter((w) => w.severity === "error");
  if (fatal.length > 0) {
    throw new Error(
      `CSV import failed: ${fatal.map((w) => w.message).join("; ")}`
    );
  }
}

function buildImportValidation(
  equipment: ZohoMappedEquipment[],
  duplicateRows: number,
  warnings: ZohoWarning[]
): ZohoImportValidation {
  const jobIds = new Set(equipment.map((e) => e.legacyZohoJobcardId));
  return {
    jobcards_imported: jobIds.size,
    assets_imported: equipment.length,
    annual_services_completed: equipment.filter(
      (e) => e.annualService?.annualServiceCompleted
    ).length,
    pressure_tests_required: equipment.filter(
      (e) => e.annualService?.pressureTestRequired
    ).length,
    quotes_required: countRequiredQuoteGroups(equipment),
    parts_used: equipment.filter((e) => e.partsUsed?.partsUsed).length,
    duplicate_records_skipped: duplicateRows,
    import_errors: warnings.filter((w) => w.severity === "error"),
    parts_used_records_created: 0,
    quotes_required_records_created: 0,
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
  const validation: ZohoImportValidation = {
    jobcards_imported: 0,
    assets_imported: 0,
    annual_services_completed: 0,
    pressure_tests_required: 0,
    quotes_required: 0,
    parts_used: 0,
    duplicate_records_skipped: 0,
    import_errors: warnings.filter((w) => w.severity === "error"),
    parts_used_records_created: 0,
    quotes_required_records_created: 0,
  };
  return {
    headers: [],
    totalCsvRows: 0,
    skippedRows: 0,
    duplicateRows: 0,
    warningRows: warnings.length,
    equipment: [],
    jobs: [],
    warnings,
    validation,
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

function padCsvRow(row: string[], columnCount: number): string[] {
  if (row.length >= columnCount) return row;
  return [...row, ...Array(columnCount - row.length).fill("")];
}

function minimumColumnsForLayout(layout: ZohoLayout): number {
  if (layout === "letter") return ZOHO_COL.ANNUAL_SERVICE_RESULT + 1;
  return HIERARCHICAL_MIN_COLUMNS;
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

function buildJobStateFromRow(
  row: CsvRow,
  headers: string[],
  columnMap: ZohoColumnMap
): JobState {
  const state: JobState = {};
  mergeJobFieldsFromRow(row, headers, columnMap, state);
  return state;
}

function mergeJobFieldsFromRow(
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
        if (isLikelyDateValue(value)) state.nextServiceDate = value;
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
  if (getZohoCell(row, headers, columnMap.portableLocation)) return true;
  return Boolean(clean(row["Portable Fire Equipment"]));
}

function hasFixedEquipment(
  row: CsvRow,
  columnMap: ZohoColumnMap,
  headers: string[]
): boolean {
  const device =
    getZohoCell(row, headers, columnMap.fixedDevice) ??
    clean(row["Fixed Fire Equipment"]);
  return isMeaningfulFixedDeviceDescription(device);
}

function isMeaningfulFixedDeviceDescription(
  value: string | null | undefined
): boolean {
  const text = clean(value);
  if (!text || isChecklistAnswer(text)) return false;
  const normalized = normalizeText(text);
  return (
    normalized.includes("hose") ||
    normalized.includes("hydrant") ||
    normalized.includes("reel") ||
    normalized.includes("sign") ||
    normalized.includes("detection") ||
    normalized.includes("sprinkler") ||
    normalized.includes("blanket")
  );
}

function isChecklistAnswer(value: string | null | undefined): boolean {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  if (
    [
      "yes",
      "y",
      "no",
      "n",
      "true",
      "false",
      "pass",
      "fail",
      "ok",
      "compliant",
      "not compliant",
    ].includes(normalized)
  ) {
    return true;
  }
  return (
    normalized.includes("pressure test") || normalized.includes("pressure testing")
  );
}

function hasLetterLayoutJobFields(
  row: CsvRow,
  headers: string[],
  columnMap: ZohoColumnMap
): boolean {
  return Boolean(
    getZohoCell(row, headers, columnMap.customerName) ||
      getZohoCell(row, headers, columnMap.addedTime) ||
      getZohoCell(row, headers, columnMap.technicianName)
  );
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

function mapJob(
  state: JobState,
  columnMap: ZohoColumnMap,
  csvRowNumber: number,
  warnings: ZohoWarning[],
  validateJobFields = true
): ZohoMappedJob {
  const uniqueId = clean(state.uniqueId);
  if (!uniqueId) {
    warnings.push({
      code: "missing_unique_id",
      message: "Missing Zoho Unique ID on jobcard row.",
      csvRowNumber,
      severity: "error",
    });
  }

  const customerName = clean(state.customerName);
  const email = clean(state.email);

  if (validateJobFields && !customerName) {
    warnings.push({
      code: "missing_customer_name",
      message: "Missing customer name on jobcard row.",
      csvRowNumber,
      severity: "error",
    });
  }
  if (validateJobFields && email && !normalizeEmail(email)) {
    warnings.push({
      code: "invalid_email",
      message: `Invalid email format: ${email}`,
      csvRowNumber,
      severity: "warning",
    });
  }

  const date = parseDate(clean(state.date));
  if (validateJobFields && clean(state.date) && !date) {
    warnings.push({
      code: "invalid_date",
      message: `Could not parse job date: ${state.date}`,
      csvRowNumber,
      severity: "warning",
    });
  }

  const nextServiceDate = parseDate(clean(state.nextServiceDate));
  if (
    validateJobFields &&
    isLikelyDateValue(state.nextServiceDate) &&
    !nextServiceDate
  ) {
    warnings.push({
      code: "invalid_next_service_date",
      message: `Could not parse next service date (column AK): ${state.nextServiceDate}`,
      csvRowNumber,
      severity: "warning",
    });
  }

  return {
    legacyZohoJobcardId: uniqueId ?? `missing-${csvRowNumber}`,
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

export function parsePortableDeviceDescription(
  description: string
): ParsedPortableDevice {
  const text = description.trim();
  const lower = text.toLowerCase();

  if (lower.includes("blanket")) {
    return {
      assetCategory: "Portable Fire Equipment",
      deviceType: "Fire Blanket",
      deviceSize: null,
      agentType: null,
      serviceType: lower.includes("service") ? "Annual Service" : null,
      assetType: "fire_blanket",
      capacity: null,
      medium: null,
      unknown: false,
      parseError: null,
    };
  }

  const deviceType = lower.includes("extinguisher") ? "Extinguisher" : "Extinguisher";
  const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*kg/i);
  const deviceSize = sizeMatch?.[0] ?? null;
  const agentType = /\bco2\b/i.test(text)
    ? "CO2"
    : /\bdcp\b/i.test(text)
      ? "DCP"
      : null;
  const serviceType = /\bservice\b/i.test(text) ? "Annual Service" : null;

  const unknown =
    !lower.includes("extinguisher") &&
    !lower.includes("blanket") &&
    !lower.includes("dcp") &&
    !lower.includes("co2");

  const parseError =
    !unknown && lower.includes("extinguisher") && !deviceSize
      ? `Could not parse extinguisher size from device description: ${description}`
      : null;

  return {
    assetCategory: "Portable Fire Equipment",
    deviceType,
    deviceSize,
    agentType,
    serviceType,
    assetType: "fire_extinguisher",
    capacity: deviceSize,
    medium: agentType,
    unknown,
    parseError,
  };
}

export function parseAnnualServiceResult(
  value: string | null | undefined
): AnnualServiceOutcome | null {
  const text = clean(value);
  if (!text) return null;
  const normalized = normalizeText(text);

  if (["yes", "compliant", "pass", "passed"].includes(normalized)) {
    return {
      annualServiceCompleted: true,
      annualServiceCompliant: true,
      pressureTestRequired: false,
      additionalWorkRequired: false,
      additionalWorkType: null,
      quoteRequired: false,
      quoteReason: null,
      followUpRequired: false,
      followUpService: null,
      assetStatus: "Annual Service Completed",
      inspectionPass: true,
    };
  }

  if (
    normalized.includes("pressure testing required") ||
    normalized.includes("pressure test required")
  ) {
    return {
      annualServiceCompleted: true,
      annualServiceCompliant: true,
      pressureTestRequired: true,
      additionalWorkRequired: true,
      additionalWorkType: "Pressure Test",
      quoteRequired: true,
      quoteReason: "Pressure Test",
      followUpRequired: true,
      followUpService: "Pressure Test",
      assetStatus: "Annual Service Completed - Pressure Test Required",
      inspectionPass: true,
    };
  }

  if (["no", "not compliant", "fail", "failed"].includes(normalized)) {
    return {
      annualServiceCompleted: false,
      annualServiceCompliant: false,
      pressureTestRequired: false,
      additionalWorkRequired: false,
      additionalWorkType: null,
      quoteRequired: false,
      quoteReason: null,
      followUpRequired: false,
      followUpService: null,
      assetStatus: "Non-Compliant",
      inspectionPass: false,
    };
  }

  return null;
}

function getCellAtIndex(cells: string[], index: number): string | null {
  if (index < 0 || index >= cells.length) return null;
  return clean(cells[index]);
}

function getPortableReplacementParts(
  row: CsvRow,
  headers: string[],
  columnMap: ZohoColumnMap,
  rawCells: string[]
): string | null {
  const candidates = [
    getZohoCell(row, headers, columnMap.replacementParts),
    getCellAtIndex(rawCells, ZOHO_COL.REPLACEMENT_PARTS),
    firstAliasedValue(row, [
      "Replacement Parts Used",
      "Replacement Parts",
      "Replacement parts used",
    ]),
  ];

  for (const candidate of candidates) {
    if (candidate && isMeaningfulPartsOrSpares(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function splitServiceParts(
  value: string | null | undefined
): ServicePartsUsed {
  const raw = clean(value);
  if (!raw || !isMeaningfulPartsOrSpares(raw)) {
    return {
      replacementPartsUsedRaw: null,
      servicePartsUsed: [],
      partsUsed: false,
    };
  }

  const servicePartsUsed = raw
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    replacementPartsUsedRaw: raw,
    servicePartsUsed,
    partsUsed: servicePartsUsed.length > 0,
  };
}

function buildAssetInspectionNotes(partsUsed: ServicePartsUsed): string | null {
  if (!partsUsed.partsUsed || partsUsed.servicePartsUsed.length === 0) {
    return null;
  }
  return partsUsed.servicePartsUsed.join(", ");
}

function mapEquipment(
  row: CsvRow,
  headers: string[],
  columnMap: ZohoColumnMap,
  csvRowNumber: number,
  section: EquipmentSection,
  job: ZohoMappedJob,
  rawCells: string[],
  portableCompliance?: string | null
): ZohoMappedEquipment {
  const warnings: ZohoWarning[] = [];
  const rawDescription =
    section === "portable"
      ? getZohoCell(row, headers, columnMap.portableDevice) ??
        clean(row["Portable Fire Equipment"])
      : getZohoCell(row, headers, columnMap.fixedDevice) ??
        clean(row["Fixed Fire Equipment"]);
  const originalDescription = rawDescription ?? "Unknown equipment";

  const parsedPortable =
    section === "portable"
      ? parsePortableDeviceDescription(originalDescription)
      : null;
  const parsedFixed =
    section === "fixed" ? parseFixedDescription(originalDescription) : null;
  const parsed = parsedPortable ?? parsedFixed!;

  if (parsedPortable?.parseError) {
    warnings.push({
      code: "device_parse_error",
      message: parsedPortable.parseError,
      csvRowNumber,
      severity: "error",
    });
  } else if (parsed.unknown) {
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
  const deviceWeightReading =
    section === "portable"
      ? getZohoCell(row, headers, columnMap.portableWeight)
      : null;
  const sizeCapacity =
    section === "portable" ? parsedPortable?.deviceSize ?? null : parsed.capacity;
  const compliance =
    section === "portable"
      ? portableCompliance !== undefined
        ? portableCompliance
        : resolvePortableCompliance(row, headers, columnMap, rawCells, null)
      : getFixedComplianceCell(row, headers, rawCells);
  const annualService = parseAnnualServiceResult(compliance);
  const partsUsed = splitServiceParts(
    section === "portable"
      ? getPortableReplacementParts(row, headers, columnMap, rawCells)
      : getZohoCell(row, headers, columnMap.fixedSpares) ??
          getCellAtIndex(rawCells, ZOHO_COL.FIXED_SPARES)
  );

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
  const inspectionNotes = buildAssetInspectionNotes(partsUsed);
  let checklist =
    section === "portable"
      ? mapPortableChecklist(
          row,
          headers,
          columnMap,
          deviceWeightReading,
          compliance,
          partsUsed,
          parsedPortable,
          annualService
        )
      : mapFixedChecklist(row, headers, columnMap, parsed.assetType, compliance, annualService);
  const defect = buildDefect(compliance, annualService, checklist);
  const followUp = buildFollowUpWork(annualService);

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

  const replacementPartsRaw =
    section === "portable"
      ? getPortableReplacementParts(row, headers, columnMap, rawCells)
      : getZohoCell(row, headers, columnMap.fixedSpares) ??
        getCellAtIndex(rawCells, ZOHO_COL.FIXED_SPARES);

  const idempotencyKey = makeImportFingerprint({
    jobcardId: job.legacyZohoJobcardId,
    deviceTypeSizeService: originalDescription,
    deviceLocation: location ?? "",
    deviceWeightReading: deviceWeightReading ?? "",
    lastPressureTestDate:
      lastPressureTestDate ??
      getZohoCell(row, headers, columnMap.portableLastPressureTest) ??
      "",
    replacementPartsUsed: replacementPartsRaw ?? "",
    annualServiceResult: compliance ?? "",
    csvRowNumber,
  });

  const inspectionPass =
    annualService?.inspectionPass ??
    isCompliant(compliance, checklist, annualService);

  return {
    csvRowNumber,
    section,
    idempotencyKey,
    legacyZohoJobcardId: job.legacyZohoJobcardId,
    rawRow: row,
    job,
    parsedDevice: parsedPortable,
    annualService,
    partsUsed: section === "portable" ? partsUsed : null,
    followUp,
    asset: {
      assetType: parsed.assetType,
      originalDescription,
      sizeCapacity,
      customerAssetNumber: null,
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
      result: inspectionPass ? "pass" : "fail",
      requiresPressureTest:
        annualService?.pressureTestRequired ?? containsPressureTest(compliance),
      requiresRefill: false,
      notes: inspectionNotes,
    },
    defect,
    warnings,
  };
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
  deviceWeightReading: string | null,
  compliance: string | null,
  partsUsed: ServicePartsUsed,
  parsedPortable: ParsedPortableDevice | null,
  annualService: AnnualServiceOutcome | null
): Record<string, string | boolean | string[] | null> {
  const [seal, damage, nozzle, pressure, accessible] =
    columnMap.portableCheckIndices.map((index) => getZohoCell(row, headers, index));
  return {
    asset_category: parsedPortable?.assetCategory ?? "Portable Fire Equipment",
    device_type: parsedPortable?.deviceType ?? null,
    device_size: parsedPortable?.deviceSize ?? null,
    agent_type: parsedPortable?.agentType ?? null,
    service_type: parsedPortable?.serviceType ?? null,
    annual_service_completed: annualService?.annualServiceCompleted ?? null,
    annual_service_compliant: annualService?.annualServiceCompliant ?? null,
    pressure_test_required: annualService?.pressureTestRequired ?? null,
    additional_work_required: annualService?.additionalWorkRequired ?? null,
    additional_work_type: annualService?.additionalWorkType ?? null,
    quote_required: annualService?.quoteRequired ?? null,
    quote_reason: annualService?.quoteReason ?? null,
    follow_up_required: annualService?.followUpRequired ?? null,
    follow_up_service: annualService?.followUpService ?? null,
    asset_status: annualService?.assetStatus ?? null,
    device_weight_reading: deviceWeightReading,
    seal_and_pin_intact: yesNo(seal),
    no_visible_damage_rust_or_corrosion: yesNo(damage),
    nozzle_free_from_obstruction_or_damage: yesNo(nozzle),
    pressure_within_operational_range: yesNo(pressure),
    accessible_and_clearly_marked: yesNo(accessible),
    replacement_parts_used_raw: partsUsed.replacementPartsUsedRaw,
    service_parts_used: partsUsed.servicePartsUsed,
    parts_used: partsUsed.partsUsed,
    replacement_parts_used: partsUsed.replacementPartsUsedRaw,
    compliant_result: compliance,
    annual_service_result: compliance,
    last_pressure_test_date: parseDate(
      getZohoCell(row, headers, columnMap.portableLastPressureTest)
    ),
  };
}

function mapFixedChecklist(
  row: CsvRow,
  headers: string[],
  columnMap: ZohoColumnMap,
  assetType: AssetType,
  compliance: string | null,
  annualService: AnnualServiceOutcome | null
): Record<string, string | boolean | string[] | null> {
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
      compliant_result: compliance,
      annual_service_completed: annualService?.annualServiceCompleted ?? null,
      annual_service_compliant: annualService?.annualServiceCompliant ?? null,
      asset_status: annualService?.assetStatus ?? null,
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
    compliant_result: compliance,
    annual_service_completed: annualService?.annualServiceCompleted ?? null,
    annual_service_compliant: annualService?.annualServiceCompliant ?? null,
    asset_status: annualService?.assetStatus ?? null,
  };
}

function buildFollowUpWork(
  annualService: AnnualServiceOutcome | null
): FollowUpWork | null {
  if (!annualService?.additionalWorkRequired) return null;

  const service = annualService.followUpService ?? annualService.additionalWorkType;
  return {
    shouldCreate: true,
    quoteRequired: annualService.quoteRequired,
    quoteReason: annualService.quoteReason,
    additionalWorkType: annualService.additionalWorkType,
    followUpService: annualService.followUpService,
    defectType: PRESSURE_TEST_DEFECT_TYPE,
    description: `Annual service completed. ${service} required as a separate follow-up service.`,
    recommendedAction: `Schedule ${service} workshop service, then return the unit to the customer once complete.`,
  };
}

export function equipmentServiceLabel(item: ZohoMappedEquipment): string {
  return normalizeText(
    item.parsedDevice?.serviceType ?? item.asset.originalDescription
  );
}

/** True only when the CSV explicitly describes an inspection — not an annual service. */
export function isExplicitInspectionService(
  item: ZohoMappedEquipment
): boolean {
  const text = equipmentServiceLabel(item);
  if (!text.includes("inspection")) return false;
  if (text.includes("annual service")) return false;
  if (/\b(service|servicing)\b/.test(text)) return false;
  return true;
}

export function buildPressureTestQuoteGroupKey(
  legacyJobcardId: string,
  siteId: string
): string {
  return `${legacyJobcardId}-${siteId}-pressure-testing`;
}

function countRequiredQuoteGroups(equipment: ZohoMappedEquipment[]): number {
  const jobcardsNeedingQuotes = new Set<string>();
  for (const item of equipment) {
    if (item.followUp?.quoteRequired) {
      jobcardsNeedingQuotes.add(item.legacyZohoJobcardId);
    }
  }
  return jobcardsNeedingQuotes.size;
}

function yesNo(value: string | null | undefined): boolean | null {
  const text = normalizeText(value);
  if (!text) return null;
  if (["yes", "y", "true", "pass", "ok", "compliant"].includes(text)) return true;
  if (["no", "n", "false", "fail", "not compliant"].includes(text)) return false;
  if (text.includes("pressure testing required")) return null;
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
  checklist: Record<string, string | boolean | string[] | null>,
  annualService: AnnualServiceOutcome | null
): boolean {
  if (annualService) return annualService.inspectionPass;
  if (containsPressureTest(compliance)) return true;
  const normalized = normalizeText(compliance);
  if (["no", "not compliant", "fail", "failed"].includes(normalized)) return false;
  if (Object.values(checklist).some((value) => value === false)) return false;
  return ["yes", "compliant", "pass", "passed"].includes(normalized);
}

function buildDefect(
  compliance: string | null,
  annualService: AnnualServiceOutcome | null,
  checklist: Record<string, string | boolean | string[] | null>
): ZohoMappedEquipment["defect"] {
  if (annualService?.inspectionPass) {
    return null;
  }

  const hasChecklistFailure = Object.entries(checklist).some(
    ([key, value]) => value === false && !key.includes("parts")
  );
  const rowFailed = !isCompliant(compliance, checklist, annualService);
  const rowSpecificText = [
    compliance,
    ...Object.entries(checklist)
      .filter(([, value]) => value === false)
      .map(([key]) => key),
  ]
    .filter(Boolean)
    .join(" ");

  const shouldCreate =
    rowFailed ||
    hasChecklistFailure ||
    containsAny(rowSpecificText, [
      "not compliant",
      "damaged",
      "missing",
      "leak",
      "rust",
      "corrosion",
      "not installed",
      "repair",
    ]);

  if (!shouldCreate) return null;

  const severity = suggestedSeverity(rowSpecificText);
  const description = [
    compliance ? `Compliance: ${compliance}` : null,
    Object.entries(checklist)
      .filter(([, value]) => value === false)
      .map(([key]) => key.replace(/_/g, " "))
      .join("; "),
  ]
    .filter(Boolean)
    .join(". ");

  return {
    shouldCreate: true,
    quoteRequired: false,
    severity,
    description: description || "Imported Zoho inspection indicates non-compliance.",
    recommendedAction: recommendedAction(rowSpecificText),
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
    normalized.includes("rust") ||
    normalized.includes("corrosion") ||
    normalized.includes("damage")
  ) {
    return "medium";
  }
  return "medium";
}

function recommendedAction(text: string): string {
  const normalized = normalizeText(text);
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
  const normalized = normalizeText(value);
  return (
    normalized.includes("pressure testing required") ||
    normalized.includes("pressure test required")
  );
}

function containsAny(value: string | null | undefined, needles: string[]): boolean {
  const haystack = normalizeText(value);
  return needles.some((needle) => haystack.includes(normalizeText(needle)));
}

function isMeaningfulPartsOrSpares(value: string | null | undefined): boolean {
  if (!value) return false;
  const text = normalizeText(value);
  if (!text) return false;
  if (["yes", "y", "no", "n", "true", "false", "pass", "fail", "ok", "compliant"].includes(text)) {
    return false;
  }
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

function makeImportFingerprint(input: {
  jobcardId: string;
  deviceTypeSizeService: string;
  deviceLocation: string;
  deviceWeightReading: string;
  lastPressureTestDate: string;
  replacementPartsUsed: string;
  annualServiceResult: string;
  csvRowNumber: number;
}): string {
  return [
    "zoho",
    normalizeText(input.jobcardId),
    normalizeText(input.deviceTypeSizeService),
    normalizeText(input.deviceLocation),
    normalizeText(input.deviceWeightReading),
    normalizeText(input.lastPressureTestDate),
    normalizeText(input.replacementPartsUsed),
    normalizeText(input.annualServiceResult),
    String(input.csvRowNumber),
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

export function buildAssetImportKey(
  item: ZohoMappedEquipment,
  siteId: string
): string {
  if (item.section === "portable" && item.parsedDevice) {
    const weightReading = normalizeText(
      item.inspection.checklist.device_weight_reading as string | null | undefined
    );
    const location = normalizeText(item.asset.locationDescription);
    return [
      "zoho-asset",
      normalizeText(item.legacyZohoJobcardId),
      normalizeText(item.parsedDevice.assetCategory),
      normalizeText(item.parsedDevice.deviceType),
      normalizeText(item.parsedDevice.deviceSize),
      normalizeText(item.parsedDevice.agentType),
      location,
      weightReading,
      // Disambiguate rows when location/weight are blank (common on Zoho child rows).
      !location && !weightReading ? `row-${item.csvRowNumber}` : "",
    ]
      .filter(Boolean)
      .join("|");
  }

  return [
    "zoho-asset",
    siteId,
    item.section,
    normalizeText(item.asset.assetType),
    normalizeText(item.asset.sizeCapacity),
    normalizeText(item.asset.customerAssetNumber),
    normalizeText(item.asset.medium),
    normalizeText(item.asset.locationDescription),
    normalizeText(item.asset.originalDescription),
  ].join("|");
}

export function jobTypeForImportedEquipment(
  equipment: ZohoMappedEquipment[]
): JobType {
  if (equipment.some((item) => isExplicitInspectionService(item))) {
    return "inspection";
  }
  return "annual_service";
}

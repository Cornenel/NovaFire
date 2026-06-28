import {
  evaluateFireExtinguisherCompliance,
  type ComplianceDefectInput,
  type FireComplianceResult,
  type FireComplianceStatus,
} from "@/lib/compliance/fireCompliance";
import type { AssetStatus, AssetType } from "@/lib/fsm/types";

type JsonRecord = Record<string, unknown>;

export interface RecheckAssetInput {
  id: string;
  asset_code?: string | null;
  asset_type?: AssetType | string | null;
  status?: AssetStatus | string | null;
  customer_asset_number?: string | null;
  serial_number?: string | null;
  location_description?: string | null;
  size_capacity?: string | null;
  asset_medium?: string | null;
  manufacture_date?: string | null;
  last_service_date?: string | null;
  next_service_date?: string | null;
  last_pressure_test_date?: string | null;
  pressure_test_due_date?: string | null;
  hydro_test_due_date?: string | null;
  notes?: string | null;
  import_raw_data?: JsonRecord | null;
  import_source?: string | null;
  legacy_zoho_jobcard_id?: string | null;
  calculated_compliance_status?: FireComplianceStatus | null;
  compliance_reasons?: string[] | null;
  compliance_next_actions?: string[] | null;
  annual_service_due_date?: string | null;
}

export interface RecheckInspectionInput {
  id?: string | null;
  result?: string | null;
  notes?: string | null;
  created_at?: string | null;
  checklist?: JsonRecord | null;
  requires_pressure_test?: boolean | null;
  legacy_zoho_jobcard_id?: string | null;
  import_raw_data?: JsonRecord | null;
  job?: {
    id?: string | null;
    status?: string | null;
    scheduled_date?: string | null;
    completed_at?: string | null;
    legacy_technician_saqcc?: string | null;
    legacy_zoho_jobcard_id?: string | null;
    import_source?: string | null;
  } | null;
}

export interface RecheckContextInput {
  asset: RecheckAssetInput;
  latestInspection?: RecheckInspectionInput | null;
  unresolvedDefects?: ComplianceDefectInput[];
}

export interface RecheckPayload {
  calculated_compliance_status: FireComplianceStatus;
  compliance_reasons: string[];
  compliance_next_actions: string[];
  compliance_source_fields: string[];
  compliance_calculated_at: string;
  annual_service_due_date: string | null;
  pressure_test_due_date: string | null;
  hydro_test_due_date: string | null;
}

export interface RecheckHistoryPayload {
  asset_id: string;
  previous_calculated_status: FireComplianceStatus | null;
  new_calculated_status: FireComplianceStatus;
  raw_imported_status: string | null;
  compliance_reasons: string[];
  compliance_next_actions: string[];
  calculated_at: string;
  source_reference: JsonRecord;
}

export interface RecheckEvaluation {
  result: FireComplianceResult;
  payload: RecheckPayload;
  history: RecheckHistoryPayload;
  rawImportedStatus: string | null;
  changed: boolean;
}

export function evaluateExistingAssetCompliance(
  input: RecheckContextInput,
  calculatedAt = new Date().toISOString()
): RecheckEvaluation {
  const { asset, latestInspection } = input;
  const rawImportedStatus =
    rawZohoComplianceStatus(latestInspection?.checklist) ??
    rawZohoComplianceStatus(latestInspection?.import_raw_data) ??
    rawZohoComplianceStatus(asset.import_raw_data);
  const latestJob = latestInspection?.job ?? null;
  const workCompletedDate =
    latestJob?.completed_at ??
    latestInspection?.created_at ??
    latestJob?.scheduled_date ??
    asset.last_service_date ??
    null;
  const workStatus = [
    latestJob?.status,
    latestInspection?.result,
    rawImportedStatus,
    latestInspection?.requires_pressure_test ? "pressure test required" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const checklistPressureDate = stringValue(
    latestInspection?.checklist,
    "last_pressure_test_date"
  );
  const result = evaluateFireExtinguisherCompliance({
    assetType: asset.asset_type,
    assetStatus: asset.status,
    assetCode: asset.asset_code,
    customerAssetNumber: asset.customer_asset_number,
    serialNumber: asset.serial_number,
    location: asset.location_description,
    sizeCapacity: asset.size_capacity,
    medium: asset.asset_medium,
    manufactureDate:
      asset.manufacture_date ??
      aliasedValue(asset.import_raw_data, [
        "Manufacture Date",
        "Manufactured Date",
        "Date Manufactured",
        "Cylinder Manufacture Date",
        "MFG Date",
      ]),
    lastServiceDate: asset.last_service_date,
    nextServiceDate: asset.next_service_date,
    lastPressureTestDate:
      asset.last_pressure_test_date ??
      checklistPressureDate ??
      aliasedValue(asset.import_raw_data, [
        "Unnamed: 9",
        "Last Pressure Test Date",
        "Pressure Test Date",
        "Last Hydro Test Date",
        "Hydro Test Date",
      ]),
    nextPressureTestDate:
      asset.pressure_test_due_date ??
      asset.hydro_test_due_date ??
      aliasedValue(asset.import_raw_data, [
        "Next Pressure Test Date",
        "Pressure Test Due Date",
        "Next Hydro Test Date",
        "Hydro Test Due Date",
      ]),
    workCompletedDate,
    workStatus,
    rawImportedStatus,
    condition: asset.notes,
    notes: [latestInspection?.notes, asset.notes].filter(Boolean).join(" "),
    technicianSaqccNumber: latestJob?.legacy_technician_saqcc,
    unresolvedDefects: input.unresolvedDefects ?? [],
  });

  const payload: RecheckPayload = {
    calculated_compliance_status: result.status,
    compliance_reasons: result.reasons,
    compliance_next_actions: result.nextActions,
    compliance_source_fields: result.sourceFieldsUsed,
    compliance_calculated_at: calculatedAt,
    annual_service_due_date: result.calculatedDates.annualServiceDueDate ?? null,
    pressure_test_due_date: result.calculatedDates.pressureTestDueDate ?? null,
    hydro_test_due_date: result.calculatedDates.pressureTestDueDate ?? null,
  };

  const history: RecheckHistoryPayload = {
    asset_id: asset.id,
    previous_calculated_status: asset.calculated_compliance_status ?? null,
    new_calculated_status: result.status,
    raw_imported_status: rawImportedStatus,
    compliance_reasons: result.reasons,
    compliance_next_actions: result.nextActions,
    calculated_at: calculatedAt,
    source_reference: {
      asset_id: asset.id,
      asset_code: asset.asset_code,
      import_source: asset.import_source,
      legacy_zoho_jobcard_id:
        asset.legacy_zoho_jobcard_id ??
        latestInspection?.legacy_zoho_jobcard_id ??
        latestJob?.legacy_zoho_jobcard_id ??
        null,
      inspection_id: latestInspection?.id ?? null,
      job_id: latestJob?.id ?? null,
      report_job_status: latestJob?.status ?? null,
    },
  };

  return {
    result,
    payload,
    history,
    rawImportedStatus,
    changed:
      asset.calculated_compliance_status !== payload.calculated_compliance_status ||
      !sameArray(asset.compliance_reasons, payload.compliance_reasons) ||
      !sameArray(asset.compliance_next_actions, payload.compliance_next_actions) ||
      (asset.annual_service_due_date ?? null) !== payload.annual_service_due_date ||
      (asset.pressure_test_due_date ?? null) !== payload.pressure_test_due_date,
  };
}

export function rawZohoComplianceStatus(raw: JsonRecord | null | undefined) {
  if (!raw) return null;
  for (const key of [
    "Compliance Status",
    "Compliance Result",
    "Compliant",
    "Is Compliant",
    "compliant_result",
    "Unnamed: 16",
    "Unnamed: 35",
  ]) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function aliasedValue(raw: JsonRecord | null | undefined, aliases: string[]) {
  if (!raw) return null;
  const normalizedAliases = aliases.map(normalize);
  for (const [key, value] of Object.entries(raw)) {
    if (normalizedAliases.includes(normalize(key)) && typeof value === "string") {
      return value.trim() || null;
    }
  }
  return null;
}

function stringValue(raw: JsonRecord | null | undefined, key: string) {
  const value = raw?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sameArray(a: string[] | null | undefined, b: string[]) {
  return JSON.stringify(a ?? []) === JSON.stringify(b);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

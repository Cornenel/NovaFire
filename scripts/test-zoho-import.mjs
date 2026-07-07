import assert from "node:assert/strict";
import {
  buildZohoColumnMap,
  parseAnnualServiceResult,
  parsePortableDeviceDescription,
  parseZohoJobcardCsv,
  splitServiceParts,
  ZOHO_COL,
} from "../src/lib/imports/zoho-jobcard.ts";
import { formatAssetDisplayName } from "../src/lib/fsm/asset-display.ts";
import {
  evaluateFireExtinguisherCompliance,
  fireComplianceConfig,
} from "../src/lib/compliance/fireCompliance.ts";
import { evaluateExistingAssetCompliance } from "../src/lib/compliance/recheck.ts";

const headers = [
  "Unique ID",
  "Date",
  "Customer Name",
  "Contact Name",
  "Phone",
  "Email",
  "Next Service Date",
  "Portable Fire Equipment",
  "Unnamed: 7",
  "Unnamed: 8",
  "Unnamed: 9",
  "Unnamed: 10",
  "Unnamed: 11",
  "Unnamed: 12",
  "Unnamed: 13",
  "Unnamed: 14",
  "Unnamed: 15",
  "Unnamed: 16",
  "Fixed Fire Equipment",
  "Unnamed: 18",
  "Unnamed: 19",
  "Unnamed: 20",
  "Unnamed: 21",
  "Unnamed: 22",
  "Unnamed: 23",
  "Unnamed: 24",
  "Unnamed: 25",
  "Unnamed: 26",
  "Unnamed: 27",
  "Unnamed: 28",
  "Unnamed: 29",
  "Unnamed: 30",
  "Unnamed: 31",
  "Unnamed: 32",
  "Unnamed: 33",
  "Unnamed: 34",
  "Unnamed: 35",
  "Opt In for Promotional and Fire Industry Newsletters",
  "Customer Name.1",
  "Technicians Name",
  "SAQCC Number",
  "Added Time",
  "Submitters Location",
  "Technicians Report",
];

function row(values) {
  return headers.map((header) => csv(values[header] ?? "")).join(",");
}

function csv(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const fixture = [
  headers.join(","),
  row({
    "Portable Fire Equipment": "Device type",
    "Unnamed: 7": "Device Weight",
    "Unnamed: 10": "Is the seal and safety pin intact?",
    "Unnamed: 34": "Is the device compliant?",
  }),
  row({
    "Unique ID": "ZJ-001",
    Date: "01/06/2025",
    "Customer Name": "Acme Foods",
    "Contact Name": "Anna",
    Phone: "012 555 1000",
    Email: "anna@example.com",
    "Next Service Date": "01/06/2026",
    "Portable Fire Equipment": "Extinguisher 9kg DCP Service",
    "Unnamed: 7": "9kg",
    "Unnamed: 8": "Kitchen",
    "Unnamed: 9": "01/06/2024",
    "Unnamed: 10": "Yes",
    "Unnamed: 11": "Yes",
    "Unnamed: 12": "Yes",
    "Unnamed: 13": "Yes",
    "Unnamed: 14": "Yes",
    "Unnamed: 34": "Yes",
    "Technicians Name": "Jacques",
    "SAQCC Number": "SAQCC-1",
    "Added Time": "2025-06-01T10:00:00Z",
    "Submitters Location": "Acme Street",
    "Technicians Report": "All good",
  }),
  row({
    "Portable Fire Equipment": "Extinguisher 5kg CO2 Service",
    "Unnamed: 7": "5kg",
    "Unnamed: 8": "Server Room",
    "Unnamed: 10": "Yes",
    "Unnamed: 11": "Yes",
    "Unnamed: 12": "Yes",
    "Unnamed: 13": "Pressure testing required",
    "Unnamed: 14": "Yes",
    "Unnamed: 34": "Pressure testing required",
  }),
  row({
    "Unique ID": "ZJ-002",
    Date: "02/06/2025",
    "Customer Name": "Beta Works",
    "Fixed Fire Equipment": "Fire Hose Reel",
    "Unnamed: 18": "Warehouse",
    "Unnamed: 19": "02/06/2024",
    "Unnamed: 20": "Yes",
    "Unnamed: 21": "Yes",
    "Unnamed: 22": "Yes",
    "Unnamed: 23": "Yes",
    "Unnamed: 24": "Yes",
    "Unnamed: 25": "Yes",
    "Unnamed: 26": "Yes",
    "Unnamed: 27": "Yes",
    "Unnamed: 34": "Yes",
  }),
].join("\n");

const parsed = parseZohoJobcardCsv(fixture);
assert.equal(parsed.headers.length, 44, "expected 44 columns");
assert.equal(parsed.skippedRows, 1, "question-label row should be skipped");
assert.equal(parsed.summary.detectedJobs, 2, "should detect two jobcards");
assert.equal(parsed.summary.portableAssets, 2, "should map portable equipment rows");
assert.equal(parsed.summary.fixedAssets, 1, "should map fixed equipment rows");
assert.equal(parsed.summary.likelyDefects, 0, "pressure testing required must not create a defect");
assert.equal(
  parsed.equipment[1].legacyZohoJobcardId,
  "ZJ-001",
  "blank job fields should forward-fill Unique ID"
);

const hundredJobCsv = [
  headers.join(","),
  ...Array.from({ length: 100 }, (_, i) =>
    row({
      "Unique ID": `JOB-${String(i + 1).padStart(3, "0")}`,
      Date: "01/01/2025",
      "Customer Name": `Customer ${i + 1}`,
      "Portable Fire Equipment": "Extinguisher 9kg DCP Service",
      "Unnamed: 7": "9kg",
      "Unnamed: 8": `Location ${i + 1}`,
      "Unnamed: 10": "Yes",
      "Unnamed: 11": "Yes",
      "Unnamed: 12": "Yes",
      "Unnamed: 13": "Yes",
      "Unnamed: 14": "Yes",
      "Unnamed: 34": "Yes",
    })
  ),
].join("\n");

const hundred = parseZohoJobcardCsv(hundredJobCsv);
assert.equal(hundred.summary.detectedJobs, 100, "should detect 100 historical jobs");
assert.equal(hundred.summary.portableAssets, 100, "should detect 100 portable records");

const repeatedReportCsv = [
  headers.join(","),
  ...Array.from({ length: 5 }, (_, i) =>
    row({
      "Unique ID": "DUP-REPORT-1",
      Date: "01/01/2026",
      "Customer Name": "Generator Site",
      "Portable Fire Equipment": `Extinguisher 9kg DCP Service ${i + 1}`,
      "Unnamed: 7": "9kg",
      "Unnamed: 8": `Generator ${i + 1}`,
      "Unnamed: 10": "Yes",
      "Unnamed: 11": "Yes",
      "Unnamed: 12": "Yes",
      "Unnamed: 13": "Yes",
      "Unnamed: 14": "Yes",
      "Unnamed: 34": "Yes",
      "Technicians Report":
        "2.5kg fire extinguisher at Generator is too small for the Generator 9kg dcp required. no visible damage rust or corrosion",
    })
  ),
].join("\n");

const repeatedReport = parseZohoJobcardCsv(repeatedReportCsv);
assert.equal(
  repeatedReport.summary.likelyDefects,
  0,
  "shared technician report text must not create duplicate defects on compliant rows"
);

const extinguisherCsv = [
  headers.join(","),
  ...[
    ["Extinguisher 9kg DCP Service", "9kg", "DCP"],
    ["Extinguisher 4.5kg DCP Service", "4.5kg", "DCP"],
    ["Extinguisher 5kg CO2 Service", "5kg", "CO2"],
    ["Extinguisher 2kg CO2 Service", "2kg", "CO2"],
    ["Extinguisher 6kg DCP Service", "6kg", "DCP"],
    ["DCP Unit", null, "DCP"],
    ["CO2 Unit", null, "CO2"],
  ].map(([description, weightReading, medium], index) =>
    row({
      "Unique ID": `EXT-${index + 1}`,
      Date: "01/01/2025",
      "Customer Name": "Extinguisher Test",
      "Portable Fire Equipment": description,
      "Unnamed: 7": weightReading ?? "",
      "Unnamed: 8": `Location ${index + 1}`,
      "Unnamed: 10": "Yes",
      "Unnamed: 11": "Yes",
      "Unnamed: 12": "Yes",
      "Unnamed: 13": "Yes",
      "Unnamed: 14": "Yes",
      "Unnamed: 34": "Yes",
    })
  ),
].join("\n");

const extinguisherMappings = parseZohoJobcardCsv(extinguisherCsv).equipment;
for (const [index, item] of extinguisherMappings.entries()) {
  assert.equal(
    item.asset.assetType,
    "fire_extinguisher",
    `row ${index + 1} should import as Fire Extinguisher`
  );
  assert.notEqual(item.asset.assetType, "dcp_unit", "DCP Unit must not be produced");
  assert.notEqual(item.asset.assetType, "co2_unit", "CO2 Unit must not be produced");
}
assert.deepEqual(
  extinguisherMappings.slice(0, 5).map((item) => [
    item.asset.sizeCapacity,
    item.asset.medium,
    item.parsedDevice?.deviceSize,
    item.inspection.checklist.device_weight_reading,
  ]),
  [
    ["9kg", "DCP", "9kg", "9kg"],
    ["4.5kg", "DCP", "4.5kg", "4.5kg"],
    ["5kg", "CO2", "5kg", "5kg"],
    ["2kg", "CO2", "2kg", "2kg"],
    ["6kg", "DCP", "6kg", "6kg"],
  ],
  "extinguisher size must come from column 6, not column 7 weight reading"
);
assert.equal(
  extinguisherMappings[4].asset.sizeCapacity,
  "6kg",
  "size must be parsed from column 6 description, not column 7"
);
assert.equal(
  extinguisherMappings[4].inspection.checklist.device_weight_reading,
  "6kg",
  "column 7 should store captured weight reading only"
);
assert.equal(
  formatAssetDisplayName({
    asset_type: "fire_extinguisher",
    customer_asset_number: null,
    size_capacity: "9kg",
    asset_medium: "DCP",
  }),
  "9kg DCP Fire Extinguisher",
  "display should use parsed capacity from column 6"
);

const firstRunKeys = new Set(parsed.equipment.map((item) => item.idempotencyKey));
const secondRunKeys = new Set(parseZohoJobcardCsv(fixture).equipment.map((item) => item.idempotencyKey));
assert.deepEqual(secondRunKeys, firstRunKeys, "idempotency keys must be stable across runs");

const baseComplianceInput = {
  assetType: "fire_extinguisher",
  assetCode: "NF-A-1",
  location: "Kitchen",
  sizeCapacity: "9kg",
  medium: "DCP",
  workStatus: "completed serviced passed",
  workCompletedDate: "2026-01-15",
  technicianSaqccNumber: "SAQCC-1",
  today: "2026-06-01",
};

assert.equal(
  evaluateFireExtinguisherCompliance({
    ...baseComplianceInput,
    lastPressureTestDate: "2024-01-15",
  }).status,
  "COMPLIANT",
  "completed service with pressure test not due should be compliant"
);

assert.equal(
  evaluateFireExtinguisherCompliance({
    ...baseComplianceInput,
    lastPressureTestDate: "2020-01-15",
  }).status,
  "NON_COMPLIANT",
  "completed service with overdue pressure test should be non-compliant"
);

assert.equal(
  evaluateFireExtinguisherCompliance({
    ...baseComplianceInput,
    lastServiceDate: "2026-01-15",
    lastPressureTestDate: "2024-01-15",
  }).status,
  "COMPLIANT",
  "completed service with annual service still valid should be compliant"
);

assert.equal(
  evaluateFireExtinguisherCompliance({
    ...baseComplianceInput,
    lastPressureTestDate: "2024-01-15",
    unresolvedDefects: [
      {
        status: "open",
        severity: "critical",
        description: "Cylinder leaking from valve",
      },
    ],
  }).status,
  "NON_COMPLIANT",
  "unresolved leaking defect should make unit non-compliant"
);

assert.notEqual(
  evaluateFireExtinguisherCompliance({
    ...baseComplianceInput,
    rawImportedStatus: "Not compliant - pressure test not due",
    notes: "No pressure test required yet",
    lastPressureTestDate: "2024-01-15",
  }).status,
  "NON_COMPLIANT",
  '"pressure test not due" must not trigger non-compliance because it contains due'
);

assert.equal(
  evaluateFireExtinguisherCompliance({
    ...baseComplianceInput,
    lastServiceDate: null,
    workCompletedDate: "2026-03-10",
    lastPressureTestDate: "2024-01-15",
  }).calculatedDates.annualServiceDueDate,
  "2027-03-10",
  "missing service date should fall back to completed work date"
);

assert.equal(
  evaluateFireExtinguisherCompliance({
    assetType: "fire_extinguisher",
    assetCode: "NF-A-2",
    location: "Stores",
    sizeCapacity: "9kg",
    medium: "DCP",
    today: "2026-06-01",
  }).status,
  "UNKNOWN",
  "missing all service/work dates should be unknown"
);

assert.equal(
  evaluateFireExtinguisherCompliance({
    ...baseComplianceInput,
    medium: "CO2",
    lastPressureTestDate: "2020-01-15",
    config: {
      ...fireComplianceConfig,
      pressureTestIntervals: {
        ...fireComplianceConfig.pressureTestIntervals,
        co2: 10,
      },
    },
  }).calculatedDates.pressureTestDueDate,
  "2030-01-15",
  "CO2 pressure test interval should be configurable"
);

const rawOverride = evaluateFireExtinguisherCompliance({
  ...baseComplianceInput,
  rawImportedStatus: "Not compliant - pressure test not due",
  notes: "Service completed; pressure test not due",
  lastPressureTestDate: "2024-01-15",
});
assert.equal(
  rawOverride.status,
  "COMPLIANT",
  "raw imported non-compliant status can be overridden when evidence supports compliance"
);
assert.ok(
  rawOverride.sourceFieldsUsed.includes("rawImportedStatus"),
  "raw imported status should remain part of audit source fields"
);

const historicalBase = {
  asset: {
    id: "asset-1",
    asset_code: "NF-A-001",
    asset_type: "fire_extinguisher",
    status: "defective",
    location_description: "Kitchen",
    size_capacity: "9kg",
    asset_medium: "DCP",
    last_service_date: null,
    next_service_date: null,
    last_pressure_test_date: "2024-01-15",
    import_raw_data: {
      "Unnamed: 16": "Not compliant - pressure test not due",
    },
    calculated_compliance_status: "NON_COMPLIANT",
    compliance_reasons: ["Old rule marked this non-compliant"],
    compliance_next_actions: [],
    annual_service_due_date: null,
    pressure_test_due_date: null,
  },
  latestInspection: {
    id: "inspection-1",
    result: "pass",
    created_at: "2026-01-15",
    checklist: {
      compliant_result: "Not compliant - pressure test not due",
      last_pressure_test_date: "2024-01-15",
    },
    job: {
      id: "job-1",
      status: "completed",
      completed_at: "2026-01-15T10:00:00Z",
      legacy_technician_saqcc: "SAQCC-1",
      legacy_zoho_jobcard_id: "ZJ-HIST-1",
      import_source: "zoho_import",
    },
  },
};

const historicalRecheck = evaluateExistingAssetCompliance(
  historicalBase,
  "2026-06-01T00:00:00.000Z"
);
assert.equal(
  historicalRecheck.result.status,
  "COMPLIANT",
  "historical completed extinguisher work with pressure test not due should update to compliant"
);
assert.equal(
  historicalRecheck.rawImportedStatus,
  "Not compliant - pressure test not due",
  "raw imported status must remain visible for audit"
);
assert.equal(
  historicalRecheck.history.previous_calculated_status,
  "NON_COMPLIANT",
  "history should capture previous calculated status"
);
assert.equal(
  historicalRecheck.history.source_reference.job_id,
  "job-1",
  "history should include source job/report reference"
);

const historicalOverdue = evaluateExistingAssetCompliance(
  {
    ...historicalBase,
    asset: {
      ...historicalBase.asset,
      id: "asset-2",
      last_pressure_test_date: "2020-01-15",
      calculated_compliance_status: "NON_COMPLIANT",
      pressure_test_due_date: "2025-01-15",
      compliance_reasons: ["Pressure test is due or overdue."],
    },
    latestInspection: {
      ...historicalBase.latestInspection,
      checklist: {
        compliant_result: "Compliant",
        last_pressure_test_date: "2020-01-15",
      },
    },
  },
  "2026-06-01T00:00:00.000Z"
);
assert.equal(
  historicalOverdue.result.status,
  "NON_COMPLIANT",
  "historical pressure test overdue should remain non-compliant"
);

const historicalMissingDates = evaluateExistingAssetCompliance(
  {
    asset: {
      id: "asset-3",
      asset_code: "NF-A-003",
      asset_type: "fire_extinguisher",
      status: "compliant",
      location_description: "Stores",
      size_capacity: "9kg",
      asset_medium: "DCP",
      calculated_compliance_status: null,
    },
  },
  "2026-06-01T00:00:00.000Z"
);
assert.equal(
  historicalMissingDates.result.status,
  "UNKNOWN",
  "historical record with missing dates should become unknown"
);

const idempotentRecheck = evaluateExistingAssetCompliance(
  {
    ...historicalBase,
    asset: {
      ...historicalBase.asset,
      calculated_compliance_status: historicalRecheck.payload.calculated_compliance_status,
      compliance_reasons: historicalRecheck.payload.compliance_reasons,
      compliance_next_actions: historicalRecheck.payload.compliance_next_actions,
      annual_service_due_date: historicalRecheck.payload.annual_service_due_date,
      pressure_test_due_date: historicalRecheck.payload.pressure_test_due_date,
    },
  },
  "2026-06-01T00:00:00.000Z"
);
assert.equal(
  idempotentRecheck.changed,
  false,
  "re-running historical recheck should be idempotent and avoid duplicate history"
);

const letterHeaders = Array.from({ length: 44 }, (_, index) => {
  if (index === 0) return "Portable Fire Equipment";
  if (index === ZOHO_COL.REPLACEMENT_PARTS) return "Replacement Parts";
  if (index === ZOHO_COL.FIXED_START) return "Fixed Fire Equipment";
  if (index === ZOHO_COL.FIXED_SPARES) return "Fixed Spares Replaced";
  if (index === ZOHO_COL.DEVICE_COMPLIANCE) return "Device Compliance";
  if (index === ZOHO_COL.NEXT_SERVICE_DATE) return "Next Service Date";
  if (index === ZOHO_COL.CUSTOMER_NAME) return "Customer Name";
  if (index === ZOHO_COL.TECHNICIAN_NAME) return "Technicians Name";
  if (index === ZOHO_COL.SAQCC_NUMBER) return "SAQCC Number";
  if (index === ZOHO_COL.ADDED_TIME) return "Added Time";
  if (index === ZOHO_COL.SUBMITTERS_LOCATION) return "Submitters Location";
  if (index === ZOHO_COL.TECHNICIAN_NOTES) return "Technicians Report";
  return `Field ${index}`;
});

function letterRow(values) {
  return letterHeaders.map((header) => csv(values[header] ?? "")).join(",");
}

const letterCsv = [
  letterHeaders.join(","),
  letterRow({
    "Portable Fire Equipment": "Device type",
    "Field 1": "Device Weight",
    "Field 4": "Is the seal and safety pin intact?",
  }),
  letterRow({
    "Portable Fire Equipment": "Extinguisher 9kg DCP Service",
    "Field 1": "9kg",
    "Field 2": "Kitchen",
    "Field 3": "01/06/2024",
    "Field 4": "Yes",
    "Field 5": "Yes",
    "Field 6": "Yes",
    "Field 7": "Yes",
    "Field 8": "Yes",
    "Replacement Parts": "Safety pin",
    "Device Compliance": "Yes",
    "Next Service Date": "01/06/2026",
    "Customer Name": "Letter Layout Customer",
    "Technicians Name": "Jacques",
    "SAQCC Number": "SAQCC-9",
    "Added Time": "2025-06-01T10:00:00Z",
    "Submitters Location": "Site A",
    "Technicians Report": "Portable service complete",
  }),
].join("\n");

const letterParsed = parseZohoJobcardCsv(letterCsv);
assert.equal(
  buildZohoColumnMap(letterHeaders).layout,
  "letter",
  "44-column export without Unique ID prefix should use letter layout"
);
assert.equal(letterParsed.summary.portableAssets, 1, "letter layout should import portable row");
assert.equal(
  letterParsed.equipment[0].job.customerName,
  "Letter Layout Customer",
  "customer name should come from column AM"
);
assert.equal(
  letterParsed.equipment[0].inspection.checklist.replacement_parts_used,
  "Safety pin",
  "replacement parts should come from column P"
);
assert.equal(
  letterParsed.equipment[0].inspection.checklist.compliant_result,
  "Yes",
  "device compliance should come from column AJ"
);

const parsedPortable = parsePortableDeviceDescription("Extinguisher 4.5kg DCP Service");
assert.deepEqual(
  {
    deviceType: parsedPortable.deviceType,
    deviceSize: parsedPortable.deviceSize,
    agentType: parsedPortable.agentType,
    serviceType: parsedPortable.serviceType,
  },
  {
    deviceType: "Extinguisher",
    deviceSize: "4.5kg",
    agentType: "DCP",
    serviceType: "Annual Service",
  },
  "column 6 description should parse device type, size, agent and service"
);

const pressureOutcome = parseAnnualServiceResult("Pressure testing required");
assert.equal(pressureOutcome?.annualServiceCompliant, true);
assert.equal(pressureOutcome?.pressureTestRequired, true);
assert.equal(pressureOutcome?.inspectionPass, true);

const parts = splitServiceParts(
  "DCP Long Operating Head W/Gauge, DCP Powder ABC 40% MAP (P/KG), Nitrogen recharge, DCP 9KG Discharge hose"
);
assert.equal(parts.partsUsed, true);
assert.equal(parts.servicePartsUsed.length, 4);

const hierarchicalHeaders = [
  "Unique ID",
  "Date",
  "Customer Name",
  "Contact Name",
  "Phone",
  "Email",
  "Portable Fire Equipment",
  "Unnamed: 7",
  "Unnamed: 8",
  "Unnamed: 9",
  "Unnamed: 10",
  "Unnamed: 11",
  "Unnamed: 12",
  "Unnamed: 13",
  "Unnamed: 14",
  "Unnamed: 15",
  "Unnamed: 16",
  "Fixed Fire Equipment",
  "Unnamed: 18",
  "Unnamed: 19",
  "Unnamed: 20",
  "Unnamed: 21",
  "Unnamed: 22",
  "Unnamed: 23",
  "Unnamed: 24",
  "Unnamed: 25",
  "Unnamed: 26",
  "Unnamed: 27",
  "Unnamed: 28",
  "Unnamed: 29",
  "Unnamed: 30",
  "Unnamed: 31",
  "Unnamed: 32",
  "Unnamed: 33",
  "Unnamed: 34",
  "Unnamed: 35",
  "Next Service Date",
  "Opt In for Promotional and Fire Industry Newsletters",
  "Customer Name.1",
  "Technicians Name",
  "SAQCC Number",
  "Added Time",
  "Submitters Location",
  "Technicians Report",
];

function hierarchicalRow(values) {
  return hierarchicalHeaders.map((header) => csv(values[header] ?? "")).join(",");
}

const portableDescriptions = [
  "Extinguisher 4.5kg DCP Service",
  "Extinguisher 1kg DCP Service",
  "Extinguisher 9kg DCP Service",
  "Extinguisher 2kg CO2 Service",
  "Extinguisher 5kg CO2 Service",
  "Extinguisher 4.5kg DCP Service",
  "Extinguisher 9kg DCP Service",
  "Extinguisher 1kg DCP Service",
  "Extinguisher 2.5kg DCP Service",
  "Extinguisher 6kg DCP Service",
  "Extinguisher 9kg DCP Service",
  "Extinguisher 4.5kg DCP Service",
  "Extinguisher 1kg DCP Service",
  "Extinguisher 9kg DCP Service",
];

const partsRow =
  "DCP Long Operating Head W/Gauge, DCP Powder ABC 40% MAP (P/KG), Nitrogen recharge, DCP 9KG Discharge hose";

const jcFixture = [
  hierarchicalHeaders.map((header, index) => csv(index === 0 ? "Jobcard Section" : header)).join(","),
  hierarchicalHeaders.join(","),
  hierarchicalRow({
    "Unique ID": "JC-01489",
    Date: "15/06/2025",
    "Customer Name": "Hierarchical Customer",
    "Contact Name": "Sam",
    Phone: "012 555 2000",
    Email: "sam@example.com",
    "Portable Fire Equipment": portableDescriptions[0],
    "Unnamed: 7": "4.5kg",
    "Unnamed: 8": "Reception",
    "Unnamed: 9": "15/06/2023",
    "Unnamed: 10": "Yes",
    "Unnamed: 11": "Yes",
    "Unnamed: 12": "Yes",
    "Unnamed: 13": "Yes",
    "Unnamed: 14": "Yes",
    "Unnamed: 15": partsRow,
    "Unnamed: 16": "Pressure testing required",
    "Technicians Name": "Tech One",
    "SAQCC Number": "SAQCC-99",
  }),
  ...portableDescriptions.slice(1).map((description, index) =>
    hierarchicalRow({
      "Portable Fire Equipment": description,
      "Unnamed: 7": description.match(/(\d+(?:\.\d+)?kg)/i)?.[1] ?? "",
      "Unnamed: 8": `Location ${index + 2}`,
      "Unnamed: 9": "15/06/2023",
      "Unnamed: 10": "Yes",
      "Unnamed: 11": "Yes",
      "Unnamed: 12": "Yes",
      "Unnamed: 13": "Yes",
      "Unnamed: 14": "Yes",
      "Unnamed: 16": "Pressure testing required",
    })
  ),
].join("\n");

const jcParsed = parseZohoJobcardCsv(jcFixture);
assert.equal(jcParsed.summary.detectedJobs, 1, "JC-01489 should create one jobcard");
assert.equal(jcParsed.summary.portableAssets, 14, "JC-01489 should import 14 portable assets");
assert.equal(jcParsed.summary.fixedAssets, 0, "JC-01489 should import no fixed assets");
assert.equal(
  jcParsed.validation.pressure_tests_required,
  14,
  "all 14 assets should require pressure testing"
);
assert.equal(
  jcParsed.validation.quote_required_records_created,
  0,
  "replacement parts must not create quote required records"
);
assert.equal(jcParsed.validation.parts_used_records_created, 1, "one asset row has used parts");
assert.ok(
  jcParsed.equipment.every(
    (item) =>
      item.annualService?.annualServiceCompliant === true &&
      item.inspection.result === "pass"
  ),
  "all assets should pass annual service inspection"
);
assert.ok(
  jcParsed.equipment.every((item) => item.defect?.shouldCreate !== true),
  "pressure test due must not create defects"
);
assert.equal(
  jcParsed.equipment[0].parsedDevice?.deviceSize,
  "4.5kg",
  "first asset size must be parsed from column 6"
);
assert.equal(
  jcParsed.equipment[1].parsedDevice?.deviceSize,
  "1kg",
  "second asset size must be parsed from column 6"
);
assert.equal(
  jcParsed.equipment[0].partsUsed?.servicePartsUsed.length,
  4,
  "replacement parts should split into used service parts"
);

assert.throws(
  () =>
    parseZohoJobcardCsv(
      [
        hierarchicalHeaders.join(","),
        hierarchicalRow({
          "Portable Fire Equipment": "Extinguisher 9kg DCP Service",
          "Unnamed: 8": "Orphan location",
          "Unnamed: 16": "Yes",
        }),
      ].join("\n")
    ),
  /before any Jobcard row/
);

assert.throws(
  () =>
    parseZohoJobcardCsv(
      [
        headers.join(","),
        row({
          "Unique ID": "BAD-PARSE",
          Date: "01/01/2025",
          "Customer Name": "Parse Fail",
          "Portable Fire Equipment": "Extinguisher DCP Service",
          "Unnamed: 8": "Kitchen",
          "Unnamed: 10": "Yes",
          "Unnamed: 11": "Yes",
          "Unnamed: 12": "Yes",
          "Unnamed: 13": "Yes",
          "Unnamed: 14": "Yes",
          "Unnamed: 34": "Yes",
        }),
      ].join("\n")
    ),
  /Could not parse extinguisher size/
);
assert.equal(
  letterParsed.equipment[0].job.nextServiceDate,
  "2026-06-01",
  "next service date should come from column AK"
);
assert.equal(
  letterParsed.equipment[0].job.technicianReport,
  "Portable service complete",
  "technician notes should come from column AR"
);

console.log("Zoho Jobcard import parser tests passed.");

import assert from "node:assert/strict";
import { parseZohoJobcardCsv } from "../src/lib/imports/zoho-jobcard.ts";

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
    "Unnamed: 35": "Is the device compliant?",
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
    "Unnamed: 16": "Yes",
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
    "Unnamed: 16": "Pressure testing required",
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
    "Unnamed: 35": "Yes",
  }),
].join("\n");

const parsed = parseZohoJobcardCsv(fixture);
assert.equal(parsed.headers.length, 44, "expected 44 columns");
assert.equal(parsed.skippedRows, 1, "question-label row should be skipped");
assert.equal(parsed.summary.detectedJobs, 2, "should detect two jobcards");
assert.equal(parsed.summary.portableAssets, 2, "should map portable equipment rows");
assert.equal(parsed.summary.fixedAssets, 1, "should map fixed equipment rows");
assert.equal(parsed.summary.likelyDefects, 1, "pressure testing required should create a defect");
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
      "Unnamed: 16": "Yes",
    })
  ),
].join("\n");

const hundred = parseZohoJobcardCsv(hundredJobCsv);
assert.equal(hundred.summary.detectedJobs, 100, "should detect 100 historical jobs");
assert.equal(hundred.summary.portableAssets, 100, "should detect 100 portable records");

const firstRunKeys = new Set(parsed.equipment.map((item) => item.idempotencyKey));
const secondRunKeys = new Set(parseZohoJobcardCsv(fixture).equipment.map((item) => item.idempotencyKey));
assert.deepEqual(secondRunKeys, firstRunKeys, "idempotency keys must be stable across runs");

console.log("Zoho Jobcard import parser tests passed.");

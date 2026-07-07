import assert from "node:assert/strict";
import {
  buildAssetTimeline,
  buildAssetUpdateFromLatestInspection,
  matchExistingCustomer,
  pickLatestInspection,
} from "../src/lib/fsm/historical-records.ts";

const customers = [
  { id: "c1", name: "Acme Foods", email: "anna@example.com", phone: "0125551000" },
  { id: "c2", name: "Beta Lodge", email: "ops@beta.co.za", phone: "0215552000" },
];

assert.equal(
  matchExistingCustomer(customers, {
    name: "Acme Foods",
    email: "anna@example.com",
    phone: "012 555 1000",
  })?.id,
  "c1",
  "servicing same customer twice should match existing customer"
);

assert.equal(
  matchExistingCustomer(customers, {
    name: "New Customer",
    email: "new@example.com",
    phone: "0115553000",
  }),
  null,
  "unknown customer should not match"
);

const inspections = [
  {
    id: "i-old",
    created_at: "2025-01-15T10:00:00.000Z",
    result: "pass",
    job_id: "j1",
    job: { scheduled_date: "2025-01-15", status: "completed" },
  },
  {
    id: "i-new",
    created_at: "2026-01-18T10:00:00.000Z",
    result: "fail",
    job_id: "j2",
    job: { scheduled_date: "2026-01-18", status: "completed" },
  },
];

assert.equal(
  pickLatestInspection(inspections)?.id,
  "i-new",
  "latest inspection should be chosen by service date"
);

const asset = {
  id: "a1",
  asset_code: "NF-A-00076",
  customer_asset_number: "6",
  created_at: "2024-02-12T08:00:00.000Z",
  manufacture_date: "2024-02-12",
  next_service_date: "2028-01-01",
};

const timeline = buildAssetTimeline({
  asset,
  inspections,
  defects: [
    {
      id: "d1",
      created_at: "2026-01-18T11:00:00.000Z",
      updated_at: "2026-01-19T09:00:00.000Z",
      defect_type: "Pressure low",
      description: "Gauge in red",
      status: "resolved",
      job_id: "j2",
    },
  ],
  events: [
    {
      id: "e1",
      created_at: "2026-01-19T09:30:00.000Z",
      event_type: "refilled",
      job_id: "j2",
      details: {},
    },
  ],
  photos: [],
});

assert.ok(
  timeline.some((entry) => entry.kind === "serviced" && entry.date === "2025-01-15"),
  "timeline should include first service visit"
);
assert.ok(
  timeline.filter((entry) => entry.kind === "serviced").length >= 1,
  "timeline should include service visits from inspections"
);
assert.ok(
  timeline.some((entry) => entry.kind === "defect" && entry.title.includes("Pressure low")),
  "timeline should include defects"
);
assert.ok(
  timeline.some((entry) => entry.kind === "repair"),
  "timeline should include repairs for resolved defects"
);
assert.ok(
  timeline.some((entry) => entry.kind === "refill"),
  "timeline should include refill events"
);
assert.ok(
  timeline.some((entry) => entry.kind === "report" && entry.reportHref === "/api/reports/j2"),
  "previous reports remain downloadable per job"
);
assert.equal(
  timeline.at(-1)?.kind,
  "next_service",
  "next service due should appear at the end"
);

const orderedDates = timeline
  .filter((entry) => entry.kind !== "next_service")
  .map((entry) => entry.sortAt);
const sorted = [...orderedDates].sort((a, b) => a.localeCompare(b));
assert.deepEqual(orderedDates, sorted, "timeline entries should be chronological");

const update = buildAssetUpdateFromLatestInspection(
  asset,
  inspections[1],
  [
    {
      status: "open",
      severity: "high",
      description: "Pressure low",
      defect_type: "Pressure low",
      recommended_action: "Refill",
    },
  ]
);

assert.equal(update.status, "defective", "open defects keep asset non-compliant");
assert.equal(update.last_service_date, "2026-01-18", "current state follows latest inspection");

const compliantUpdate = buildAssetUpdateFromLatestInspection(asset, inspections[0], []);
assert.equal(
  compliantUpdate.status,
  "compliant",
  "latest compliant inspection should update current compliance"
);

console.log("historical-records tests passed");

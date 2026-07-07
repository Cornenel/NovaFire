import assert from "node:assert/strict";
import {
  calculateComplianceScore,
} from "../src/lib/fsm/compliance.ts";
import {
  countComplianceFireRisks,
  isUnresolvedFireRisk,
} from "../src/lib/fsm/fire-risks.ts";

const baseAssets = [
  {
    status: "compliant",
    next_service_date: "2027-01-01",
    asset_type: "fire_extinguisher",
    location_description: "Kitchen",
    size_capacity: "4.5kg",
    asset_medium: "dry powder",
    calculated_compliance_status: "COMPLIANT",
    annual_service_due_date: "2027-01-01",
    pressure_test_due_date: null,
  },
  {
    status: "compliant",
    next_service_date: "2027-01-01",
    asset_type: "fire_extinguisher",
    location_description: "Reception",
    size_capacity: "4.5kg",
    asset_medium: "dry powder",
    calculated_compliance_status: "COMPLIANT",
    annual_service_due_date: "2027-01-01",
    pressure_test_due_date: null,
  },
];

const baseline = calculateComplianceScore({
  assets: baseAssets,
  openDefects: 0,
});

const withCriticalRisk = calculateComplianceScore({
  assets: baseAssets,
  openDefects: 0,
  criticalFireRisks: 1,
  unresolvedFireRisks: 1,
});

assert.ok(
  withCriticalRisk.score < baseline.score,
  "critical unresolved fire risk should reduce compliance score"
);

const riskCounts = countComplianceFireRisks([
  { severity: "critical", status: "open" },
  { severity: "high", status: "in_progress" },
  { severity: "low", status: "resolved" },
]);

assert.equal(riskCounts.unresolved, 2, "open and in_progress count as unresolved");
assert.equal(riskCounts.criticalUnresolved, 1, "only critical unresolved risks counted");

assert.equal(isUnresolvedFireRisk("open"), true);
assert.equal(isUnresolvedFireRisk("resolved"), false);

console.log("fire risk compliance tests passed");

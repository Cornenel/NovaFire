import assert from "node:assert/strict";
import { buildApplicabilityContext, getApplicableChecks } from "../src/lib/checklists/applicability.ts";
import { getDetailedSectionsForAssetType } from "../src/lib/checklists/definitions/index.ts";
import { buildLegacyInspectionChecklist } from "../src/lib/checklists/legacy-bridge.ts";
import {
  deriveSuggestedOverallResult,
  mapOverallResultToInspectionResult,
  validateChecklistCompletion,
  validateChecklistDraft,
} from "../src/lib/checklists/validation.ts";
import { featureFlags } from "../src/lib/fsm/feature-flags.ts";

assert.equal(
  featureFlags.mandatoryAssetInspections,
  process.env.NEXT_PUBLIC_FF_MANDATORY_ASSET_INSPECTIONS === "true" ||
    process.env.MANDATORY_ASSET_INSPECTIONS_ENABLED === "true",
  "mandatoryAssetInspections should follow env"
);

const co2Asset = {
  asset_type: "fire_extinguisher",
  asset_medium: "CO2",
  size_capacity: "5kg",
};
const co2Ctx = buildApplicabilityContext(co2Asset);
const extSections = getDetailedSectionsForAssetType("fire_extinguisher");
const co2Checks = getApplicableChecks(extSections, co2Ctx);
assert.ok(!co2Checks.some((c) => c.key === "gauge_in_range"));
assert.ok(co2Checks.some((c) => c.key === "co2_weight_verified"));

const dcpCtx = buildApplicabilityContext({
  asset_type: "fire_extinguisher",
  asset_medium: "DCP",
  size_capacity: "9kg",
});
const dcpChecks = getApplicableChecks(extSections, dcpCtx);
assert.ok(dcpChecks.some((c) => c.key === "gauge_in_range"));

const hoseSections = getDetailedSectionsForAssetType("hose_reel");
const hoseChecks = getApplicableChecks(
  hoseSections,
  buildApplicabilityContext({
    asset_type: "hose_reel",
    asset_medium: null,
    size_capacity: "30m",
  })
);
assert.ok(hoseChecks.some((c) => c.key === "unable_to_test_water"));

const failAnswer = {
  sectionKey: "cylinder_body",
  checkKey: "no_leakage",
  label: "No evidence of leakage",
  result: "fail",
  defectSeverity: "critical",
};
const completionIssues = validateChecklistCompletion(
  {
    checklistId: "c1",
    jobId: "j1",
    assetId: "a1",
    assetType: "fire_extinguisher",
    technicianId: "t1",
    answers: [failAnswer],
    overallResult: "replacement_required",
    notes: null,
    finalConditionConfirmed: false,
    customerInformed: false,
    inspectionId: "i1",
    legacyChecklist: {},
    inspectionResult: "fail",
    requiresRefill: false,
    requiresPressureTest: false,
    serviceDate: "2026-01-01",
    nextServiceDate: "2027-01-01",
    defects: [],
  },
  extSections,
  dcpCtx
);
assert.ok(completionIssues.some((i) => i.checkKey === "no_leakage"));

const passAnswers = dcpChecks
  .filter((c) => c.answerType === "pass_fail_na")
  .slice(0, 20)
  .map((c) => ({
    sectionKey: c.sectionKey,
    checkKey: c.key,
    label: c.label,
    result: "pass",
  }));
const draftIssues = validateChecklistDraft(extSections, dcpCtx, passAnswers);
assert.ok(draftIssues.length > 0);

const legacy = buildLegacyInspectionChecklist("fire_extinguisher", [
  {
    sectionKey: "valve_mechanism",
    checkKey: "safety_pin_present",
    label: "Safety pin is present",
    result: "pass",
  },
]);
assert.equal(legacy.safety_pin_present, true);

assert.equal(deriveSuggestedOverallResult([failAnswer]), "replacement_required");
assert.equal(mapOverallResultToInspectionResult("unable_to_test", [failAnswer]), "fail");

console.log("mandatory checklist tests passed");

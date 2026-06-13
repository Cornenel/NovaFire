import type { AssetType } from "./types";

/**
 * Inspection checklist templates per asset type.
 * Answers are stored as jsonb on `inspections.checklist`, keyed by item id.
 */

export interface ChecklistItem {
  id: string;
  label: string;
}

export const FIRE_EXTINGUISHER_CHECKLIST: ChecklistItem[] = [
  { id: "accessible", label: "Accessible" },
  { id: "correct_location", label: "Correct location" },
  { id: "correct_signage", label: "Correct signage" },
  { id: "pressure_gauge_ok", label: "Pressure gauge OK" },
  { id: "safety_pin_present", label: "Safety pin present" },
  { id: "seal_intact", label: "Seal intact" },
  { id: "hose_nozzle_condition", label: "Hose / nozzle condition" },
  { id: "cylinder_condition", label: "Cylinder condition" },
  { id: "corrosion_check", label: "Corrosion check" },
  { id: "weight_check", label: "Weight check" },
  { id: "service_label_updated", label: "Service label updated" },
];

export const HOSE_REEL_CHECKLIST: ChecklistItem[] = [
  { id: "accessible", label: "Accessible" },
  { id: "cabinet_condition", label: "Cabinet condition" },
  { id: "hose_condition", label: "Hose condition" },
  { id: "nozzle_condition", label: "Nozzle condition" },
  { id: "valve_operation", label: "Valve operation" },
  { id: "water_pressure_flow", label: "Water pressure / flow" },
  { id: "no_leaks", label: "No leaks" },
  { id: "signage_present", label: "Signage present" },
];

export const HYDRANT_CHECKLIST: ChecklistItem[] = [
  { id: "visible_access_clear", label: "Visible / access clear" },
  { id: "cap_present", label: "Cap present" },
  { id: "threads_condition", label: "Threads condition" },
  { id: "valve_operation", label: "Valve operation" },
  { id: "flow_test_ok", label: "Flow test result OK" },
  { id: "no_leaks", label: "No leaks" },
  { id: "signage_present", label: "Signage present" },
];

/** Generic checklist for asset types without a dedicated template. */
export const GENERAL_CHECKLIST: ChecklistItem[] = [
  { id: "accessible", label: "Accessible" },
  { id: "correct_location", label: "Correct location" },
  { id: "good_condition", label: "Good condition" },
  { id: "signage_present", label: "Signage present" },
];

export function getChecklistForAssetType(type: AssetType): ChecklistItem[] {
  switch (type) {
    case "fire_extinguisher":
      return FIRE_EXTINGUISHER_CHECKLIST;
    case "hose_reel":
      return HOSE_REEL_CHECKLIST;
    case "hydrant":
      return HYDRANT_CHECKLIST;
    default:
      return GENERAL_CHECKLIST;
  }
}

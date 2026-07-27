import type { ChecklistSectionDefinition } from "../types";
import { numericCheck, pfCheck, pfChecks } from "./helpers";

export const HYDRANT_SECTIONS: ChecklistSectionDefinition[] = [
  {
    key: "location_accessibility",
    title: "Location and accessibility",
    checks: pfChecks([
      ["in_recorded_location", "Hydrant is in the recorded location"],
      ["visible", "Hydrant is visible"],
      ["unobstructed", "Hydrant is unobstructed"],
      ["brigade_access_clear", "Fire-brigade access is clear"],
      ["signage_present", "Correct signage or identification is present"],
      ["id_legible", "Identification number is legible"],
      ["landscaping_clear", "Landscaping does not obstruct access"],
      ["bollards_intact", "Protective bollards are intact, if fitted"],
    ]),
  },
  {
    key: "external_condition",
    title: "External condition",
    checks: pfChecks([
      ["no_corrosion", "Hydrant body has no unacceptable corrosion"],
      ["no_mechanical_damage", "Hydrant has no mechanical damage"],
      ["coating_acceptable", "Paint or protective coating is acceptable"],
      ["outlets_undamaged", "Outlets are undamaged"],
      ["caps_fitted", "Outlet caps are fitted"],
      ["chains_secure", "Cap chains are fitted and secure"],
      ["threads_clean", "Threads or couplings are clean"],
      ["threads_undamaged", "Threads or couplings are undamaged"],
      ["seals_present", "Gaskets or seals are present"],
      ["no_visible_leakage", "No visible leakage is present"],
      ["no_unauthorised_mod", "No unauthorised modification is visible"],
    ]),
  },
  {
    key: "valve_operation",
    title: "Valve operation",
    checks: pfChecks([
      ["mechanism_accessible", "Valve operating mechanism is accessible"],
      ["opens_correctly", "Valve opens correctly"],
      ["closes_correctly", "Valve closes correctly"],
      ["operation_smooth", "Operation is smooth"],
      ["does_not_seize", "Valve does not seize"],
      ["leakage_acceptable", "Leakage after closing is acceptable"],
      ["spindle_undamaged", "Spindle, key point, or operating nut is undamaged"],
    ]),
  },
  {
    key: "flow_pressure",
    title: "Flow and pressure testing",
    checks: [
      pfCheck("water_supply_available", "Water supply available"),
      pfCheck("hydrant_flowed", "Hydrant flowed"),
      numericCheck("static_pressure", "Static pressure", "kPa", { mandatory: false }),
      numericCheck("residual_pressure", "Residual pressure", "kPa", { mandatory: false }),
      numericCheck("flow_rate", "Flow rate", "L/min", { mandatory: false }),
      pfCheck("leakage_during_test", "Leakage during test"),
      pfCheck("adequate_pressure", "Adequate pressure observed"),
      pfCheck("adequate_flow", "Adequate flow observed"),
      pfCheck("unable_to_test", "Unable to test — site restriction or no water", {
        failRequiresPhoto: true,
        criticalOnFail: true,
      }),
    ],
  },
  {
    key: "completion",
    title: "Completion",
    checks: pfChecks([
      ["caps_refitted", "Outlet caps refitted"],
      ["chains_secured", "Chains secured"],
      ["valve_closed", "Valve fully closed"],
      ["area_safe", "Area left safe"],
      ["service_label", "Service label fitted where applicable"],
      ["register_updated", "Register updated or queued"],
    ]),
  },
];

export const CABINET_SECTIONS: ChecklistSectionDefinition[] = [
  {
    key: "cabinet",
    title: "Fire extinguisher cabinet",
    checks: pfChecks([
      ["securely_mounted", "Cabinet securely mounted"],
      ["door_opens", "Door opens freely"],
      ["door_closes", "Door closes correctly"],
      ["hinges_ok", "Hinges are serviceable"],
      ["panel_intact", "Glass or transparent panel is intact"],
      ["lock_operational", "Lock is operational, where fitted"],
      ["break_glass_present", "Break-glass hammer is present, where required"],
      ["not_obstructed", "Cabinet is not obstructed"],
      ["clean", "Cabinet is clean"],
      ["no_corrosion", "Cabinet has no unacceptable corrosion"],
      ["signage_visible", "Correct signage is visible"],
      ["extinguisher_fits", "Extinguisher fits correctly"],
      ["quick_removal", "Extinguisher can be removed quickly"],
    ]),
  },
];

export const SIGNAGE_SECTIONS: ChecklistSectionDefinition[] = [
  {
    key: "signage",
    title: "Fire-equipment signage",
    checks: pfChecks([
      ["correct_type", "Correct sign type"],
      ["corresponds_equipment", "Sign corresponds with the equipment"],
      ["visible_approach", "Sign is visible from the expected approach"],
      ["not_obstructed", "Sign is not obstructed"],
      ["securely_mounted", "Sign is securely mounted"],
      ["legible", "Sign is legible"],
      ["not_faded", "Sign is not badly faded"],
      ["not_damaged", "Sign is not damaged"],
      ["directional_present", "Directional sign is present where required"],
      ["positioned_correctly", "Sign is positioned correctly"],
      ["photoluminescent_ok", "Photoluminescent condition is acceptable where applicable"],
    ]),
  },
];

export const SITE_OBSERVATION_TYPES = [
  "Missing equipment",
  "Equipment obstructed",
  "Incorrect extinguisher type",
  "Incorrect equipment placement",
  "Missing signage",
  "Damaged brackets",
  "Damaged cabinets",
  "Inaccessible equipment",
  "Fire door obstructed",
  "Escape route obstructed",
  "Fire alarm fault visibly displayed",
  "Fire alarm left muted",
  "Sprinkler defect visibly observed",
  "Sprinkler valve closed or inaccessible",
  "Hose reel or hydrant without water",
  "Emergency lighting visibly damaged",
  "Fire register unavailable",
  "Other observation",
] as const;

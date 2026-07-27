import type { ChecklistSectionDefinition, ApplicabilityContext } from "../types";
import { numericCheck, pfCheck, pfChecks } from "./helpers";

const cabinetChecks = pfChecks(
  [
    ["cabinet_accessible", "Cabinet is accessible, if fitted"],
    ["cabinet_condition", "Cabinet condition is acceptable, if fitted"],
  ],
  { applicable: (ctx: ApplicabilityContext) => ctx.hasCabinet !== false, naRequiresReason: true }
);

export const EXTINGUISHER_SECTIONS: ChecklistSectionDefinition[] = [
  {
    key: "location_accessibility",
    title: "Location and accessibility",
    checks: [
      ...pfChecks([
        ["installed_designated_location", "Installed in the designated location"],
        ["equipment_visible", "Equipment is visible"],
        ["equipment_unobstructed", "Equipment is unobstructed"],
        ["equipment_accessible", "Equipment is easily accessible"],
        ["correct_type_for_hazard", "Correct extinguisher type for the identified hazard"],
        ["correct_size_rating", "Correct equipment size or rating"],
        ["correct_mounting_method", "Correct bracket, stand, or mounting method"],
        ["bracket_secure", "Bracket is secure"],
        ["mounting_acceptable", "Mounting condition is acceptable"],
        ["signage_installed", "Correct fire-equipment signage is installed"],
        ["signage_visible", "Signage is visible and legible"],
      ]),
      ...cabinetChecks,
    ],
  },
  {
    key: "cylinder_body",
    title: "Cylinder and body condition",
    checks: [
      ...pfChecks(
        [
          ["no_unacceptable_corrosion", "Cylinder has no unacceptable corrosion"],
          ["no_dents", "Cylinder has no dents"],
          ["no_gouges", "Cylinder has no gouges"],
          ["no_bulging", "Cylinder has no bulging"],
          ["no_heat_damage", "Cylinder has no heat damage"],
          ["no_chemical_damage", "Cylinder has no chemical damage"],
          ["no_paint_deterioration", "Cylinder has no unacceptable paint deterioration"],
          ["no_weld_damage", "Cylinder has no visible weld damage"],
          ["no_unauthorised_mods", "Cylinder has no unauthorised repairs or modifications"],
          ["id_legible", "Cylinder identification is legible"],
          ["serial_legible", "Serial number is legible"],
          ["manufacturing_legible", "Manufacturing details are legible"],
          ["instructions_legible", "Operating instructions are legible"],
          ["medium_label_legible", "Extinguishing-medium label is legible"],
          ["rating_legible", "Hazard classification or rating is legible"],
          ["no_tampering", "No evidence of tampering"],
          ["no_leakage", "No evidence of leakage"],
        ],
        { failRequiresPhoto: true, criticalOnFail: true }
      ),
    ],
  },
  {
    key: "valve_mechanism",
    title: "Valve and operating mechanism",
    checks: pfChecks([
      ["valve_secure", "Valve assembly is secure"],
      ["handle_undamaged", "Carrying handle is undamaged"],
      ["lever_undamaged", "Operating lever is undamaged"],
      ["safety_pin_present", "Safety pin is present"],
      ["tamper_seal_intact", "Tamper seal is present and intact"],
      ["valve_no_corrosion", "Valve has no unacceptable corrosion"],
      ["valve_threads_ok", "Valve threads appear undamaged"],
      ["no_valve_leakage", "No visible leakage around the valve"],
      ["components_unobstructed", "Operating components are free from obstruction"],
      ["safety_devices_present", "Safety devices are present where applicable"],
    ]),
  },
  {
    key: "pressure_indication",
    title: "Pressure indication",
    description: "For stored-pressure extinguishers.",
    checks: [
      ...pfChecks(
        [
          ["gauge_present", "Pressure gauge is present"],
          ["gauge_lens_intact", "Gauge lens is intact"],
          ["gauge_undamaged", "Gauge is undamaged"],
          ["gauge_in_range", "Gauge needle is within the acceptable operating range"],
          ["no_moisture_in_gauge", "No visible moisture inside the gauge"],
          ["gauge_readable", "Gauge is readable"],
        ],
        { applicable: (ctx: ApplicabilityContext) => ctx.isStoredPressure === true && !ctx.isCo2 }
      ),
      pfCheck("pressure_section_na", "Pressure gauge section not applicable", {
        applicable: (ctx: ApplicabilityContext) => ctx.isCo2 === true,
        mandatory: false,
      }),
    ],
  },
  {
    key: "hose_nozzle",
    title: "Hose, horn, nozzle, and discharge assembly",
    checks: pfChecks(
      [
        ["correct_discharge_fitted", "Correct hose, horn, or nozzle is fitted"],
        ["hose_no_cracks", "Hose has no cracks"],
        ["hose_not_brittle", "Hose is not brittle"],
        ["hose_no_abrasions", "Hose has no abrasions"],
        ["hose_no_blockage", "Hose has no blockage"],
        ["couplings_secure", "Hose couplings are secure"],
        ["nozzle_undamaged", "Nozzle or horn is undamaged"],
        ["nozzle_clean", "Nozzle is clean"],
        ["outlet_unobstructed", "Discharge outlet is unobstructed"],
        ["hose_retaining_ok", "Hose retaining method is acceptable"],
      ],
      { applicable: (ctx: ApplicabilityContext) => ctx.hasHose !== false }
    ),
  },
  {
    key: "weight_medium",
    title: "Weight and extinguishing medium",
    checks: [
      numericCheck("gross_weight", "Gross weight recorded", "kg", {
        applicable: (ctx: ApplicabilityContext) => ctx.isCo2 === true || ctx.isPowder === true,
      }),
      numericCheck("tare_weight", "Tare weight available", "kg", {
        applicable: (ctx: ApplicabilityContext) => ctx.isCo2 === true,
        mandatory: false,
      }),
      numericCheck("calculated_contents", "Calculated content weight recorded", "kg", {
        applicable: (ctx: ApplicabilityContext) => ctx.isCo2 === true || ctx.isPowder === true,
      }),
      pfCheck("content_within_tolerance", "Content weight within acceptable tolerance", {
        applicable: (ctx: ApplicabilityContext) => ctx.isCo2 === true || ctx.isPowder === true,
      }),
      pfCheck("co2_weight_verified", "CO2 extinguisher weight verified", {
        applicable: (ctx: ApplicabilityContext) => ctx.isCo2 === true,
      }),
      pfCheck("medium_loss_checked", "Evidence of extinguishing-medium loss checked", {
        applicable: (ctx: ApplicabilityContext) => !ctx.isCo2,
      }),
      pfCheck("powder_condition", "Powder condition checked per approved service process", {
        applicable: (ctx: ApplicabilityContext) => ctx.isPowder === true,
      }),
      pfCheck("medium_correct", "Extinguishing medium is correct for the extinguisher"),
    ],
  },
  {
    key: "service_dates",
    title: "Service and pressure-test dates",
    checks: [
      ...pfChecks([
        ["manufacture_date_confirmed", "Manufacturing date recorded or confirmed"],
        ["previous_service_confirmed", "Previous service date recorded or confirmed"],
        ["pressure_test_date_confirmed", "Pressure-test date recorded or confirmed"],
        ["next_pressure_test_calculated", "Next pressure-test due date calculated"],
        ["pressure_test_due", "Pressure test currently due"],
        ["extended_service_required", "Extended service or recharge required"],
        ["service_label_legible", "Existing service label is legible"],
        ["pressure_marking_legible", "Existing pressure-test marking is legible"],
      ]),
    ],
  },
  {
    key: "service_completion",
    title: "Service completion",
    checks: pfChecks([
      ["service_work_completed", "Required service work completed"],
      ["correct_components", "Correct components fitted"],
      ["new_tamper_seal", "New tamper seal fitted"],
      ["new_service_label", "New service label fitted"],
      ["service_date_recorded", "Service date recorded"],
      ["next_service_recorded", "Next service date recorded"],
      ["technician_recorded", "Technician name or registration number recorded"],
      ["returned_to_location", "Asset returned to correct location"],
      ["condition_after_service", "Asset condition after service confirmed"],
      ["register_updated", "Fire register updated or queued for update"],
    ]),
  },
];

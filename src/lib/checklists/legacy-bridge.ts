import { getChecklistForAssetType } from "@/lib/fsm/checklists";
import type { AssetType } from "@/lib/fsm/types";
import type { StoredCheckAnswer } from "./types";

/**
 * Maps detailed checklist answers to the legacy boolean checklist keys
 * used by inspections.checklist and existing PDF summaries.
 */
export function buildLegacyInspectionChecklist(
  assetType: AssetType,
  answers: StoredCheckAnswer[]
): Record<string, boolean> {
  const template = getChecklistForAssetType(assetType);
  const legacy: Record<string, boolean> = {};

  const answerByKey = new Map<string, StoredCheckAnswer>();
  for (const answer of answers) {
    answerByKey.set(answer.checkKey, answer);
    answerByKey.set(`${answer.sectionKey}_${answer.checkKey}`, answer);
  }

  const synonymMap: Record<string, string[]> = {
    accessible: ["equipment_accessible", "access_unobstructed", "visible", "in_recorded_location"],
    correct_location: ["installed_designated_location", "in_recorded_location"],
    correct_signage: ["signage_installed", "signage_visible", "signage_legible", "signage_present"],
    pressure_gauge_ok: ["gauge_in_range", "gauge_present", "gauge_readable"],
    safety_pin_present: ["safety_pin_present"],
    seal_intact: ["tamper_seal_intact", "new_tamper_seal"],
    hose_nozzle_condition: ["nozzle_undamaged", "hose_no_cracks", "correct_discharge_fitted"],
    cylinder_condition: ["no_dents", "no_bulging", "no_unacceptable_corrosion"],
    corrosion_check: ["no_unacceptable_corrosion", "no_corrosion", "valve_no_corrosion"],
    weight_check: ["content_within_tolerance", "co2_weight_verified", "gross_weight"],
    service_label_updated: ["new_service_label", "service_label", "service_label_legible"],
    cabinet_condition: ["cabinet_condition", "cabinet_opens"],
    hose_condition: ["no_cuts", "no_cracks", "not_perished"],
    nozzle_condition: ["nozzle_secure", "opens_correctly", "closes_correctly"],
    valve_operation: ["valve_opens", "valve_closes", "opens_correctly"],
    water_pressure_flow: ["adequate_flow", "adequate_pressure", "water_reached_nozzle"],
    no_leaks: ["no_leakage", "no_leaks", "valve_no_leak"],
    signage_present: ["signage_installed", "signage_visible", "signage_present"],
    visible_access_clear: ["visible", "unobstructed", "brigade_access_clear"],
    cap_present: ["caps_fitted", "caps_refitted"],
    threads_condition: ["threads_undamaged", "threads_clean"],
    flow_test_ok: ["hydrant_flowed", "adequate_flow"],
    good_condition: ["no_mechanical_damage", "condition_after_service"],
  };

  for (const item of template) {
    const candidates = [item.id, ...(synonymMap[item.id] ?? [])];
    let resolved: boolean | undefined;
    for (const key of candidates) {
      const answer = answerByKey.get(key);
      if (!answer) continue;
      if (answer.result === "pass") {
        resolved = true;
        break;
      }
      if (answer.result === "fail") {
        resolved = false;
        break;
      }
      if (answer.result === "not_applicable") {
        resolved = true;
        break;
      }
    }
    if (resolved !== undefined) {
      legacy[item.id] = resolved;
    }
  }

  return legacy;
}

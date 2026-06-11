/**
 * F3/F7 knowledge base: defect type → recommended corrective action,
 * suggested severity, replacement parts and quote line item.
 *
 * Suggestions only – the technician/dispatcher always has final control.
 */

import type { DefectSeverity } from "./types";

export interface DefectSuggestion {
  action: string;
  severity: DefectSeverity;
  parts: string[];
  quoteItem: string;
}

export const DEFECT_KNOWLEDGE: Record<string, DefectSuggestion> = {
  "Pressure loss": {
    action: "Refill extinguisher and inspect valve assembly for leaks.",
    severity: "high",
    parts: ["Refill charge", "Valve seal"],
    quoteItem: "Extinguisher Refill & Valve Inspection",
  },
  Corrosion: {
    action:
      "Assess corrosion depth. Surface rust: clean and treat. Structural: replace cylinder and schedule pressure test.",
    severity: "medium",
    parts: ["Replacement cylinder (if structural)"],
    quoteItem: "Cylinder Assessment / Replacement",
  },
  "Damaged hose / nozzle": {
    action: "Replace hose and nozzle assembly; verify discharge path is clear.",
    severity: "medium",
    parts: ["Hose assembly", "Nozzle"],
    quoteItem: "Hose & Nozzle Replacement",
  },
  "Seal broken": {
    action:
      "Verify contents and pressure, re-pin and fit a new tamper seal. Investigate possible discharge.",
    severity: "medium",
    parts: ["Tamper seal", "Safety pin"],
    quoteItem: "Re-seal & Service Check",
  },
  "Safety pin missing": {
    action: "Fit new safety pin and tamper seal; check for accidental discharge.",
    severity: "medium",
    parts: ["Safety pin", "Tamper seal"],
    quoteItem: "Safety Pin & Seal Replacement",
  },
  "Missing signage": {
    action: "Install SANS-compliant fire equipment signage at the asset location.",
    severity: "low",
    parts: ["Fire signage"],
    quoteItem: "Fire Sign Replacement",
  },
  "Obstructed access": {
    action:
      "Instruct site contact to clear obstruction immediately; equipment must remain accessible at all times.",
    severity: "high",
    parts: [],
    quoteItem: "Site Compliance Visit",
  },
  "Physical damage": {
    action:
      "Evaluate operational integrity. Replace unit if cylinder, gauge or operating mechanism is compromised.",
    severity: "high",
    parts: ["Replacement unit (if compromised)"],
    quoteItem: "Unit Replacement",
  },
  Leak: {
    action:
      "Isolate and identify leak source. Repair valve/connection or replace unit; re-test before returning to service.",
    severity: "critical",
    parts: ["Valve assembly", "Seals"],
    quoteItem: "Leak Repair & Re-test",
  },
  "Expired / overdue service": {
    action: "Carry out full service immediately and update service label.",
    severity: "high",
    parts: ["Service label"],
    quoteItem: "Full Service",
  },
};

export function getDefectSuggestion(
  defectType: string
): DefectSuggestion | null {
  return DEFECT_KNOWLEDGE[defectType] ?? null;
}

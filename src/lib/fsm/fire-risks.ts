/**
 * Phase 4: Site fire risk register – types, labels, compliance helpers.
 */

import type {
  FireRiskSeverity,
  FireRiskStatus,
  FireRiskType,
} from "./types";

export const FIRE_RISK_TYPES: FireRiskType[] = [
  "fire_hazard",
  "blocked_exit",
  "missing_signage",
  "combustible_storage",
  "electrical_risk",
  "emergency_lighting_issue",
  "evacuation_concern",
  "access_obstruction",
  "thatch_fire_spread_risk",
  "other",
];

export const FIRE_RISK_TYPE_LABELS: Record<FireRiskType, string> = {
  fire_hazard: "Fire hazard",
  blocked_exit: "Blocked exit",
  missing_signage: "Missing signage",
  combustible_storage: "Combustible storage",
  electrical_risk: "Electrical risk",
  emergency_lighting_issue: "Emergency lighting issue",
  evacuation_concern: "Evacuation concern",
  access_obstruction: "Access obstruction",
  thatch_fire_spread_risk: "Thatch / fire spread risk",
  other: "Other",
};

export const FIRE_RISK_SEVERITY_LABELS: Record<FireRiskSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const FIRE_RISK_SEVERITY_STYLES: Record<FireRiskSeverity, string> = {
  low: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  medium: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  high: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/40",
};

export const FIRE_RISK_STATUS_LABELS: Record<FireRiskStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  accepted_risk: "Accepted Risk",
};

export const FIRE_RISK_STATUS_STYLES: Record<FireRiskStatus, string> = {
  open: "bg-red-500/15 text-red-400 border-red-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  accepted_risk: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export const UNRESOLVED_FIRE_RISK_STATUSES: FireRiskStatus[] = [
  "open",
  "in_progress",
];

export function isUnresolvedFireRisk(status: FireRiskStatus): boolean {
  return UNRESOLVED_FIRE_RISK_STATUSES.includes(status);
}

export interface FireRiskComplianceInput {
  severity: FireRiskSeverity;
  status: FireRiskStatus;
}

/** Critical unresolved fire risks reduce compliance score. */
export function countComplianceFireRisks(risks: FireRiskComplianceInput[]): {
  unresolved: number;
  criticalUnresolved: number;
} {
  const unresolved = risks.filter((r) => isUnresolvedFireRisk(r.status));
  return {
    unresolved: unresolved.length,
    criticalUnresolved: unresolved.filter((r) => r.severity === "critical").length,
  };
}

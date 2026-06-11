import type {
  AssetStatus,
  AssetType,
  DefectSeverity,
  JobPriority,
  JobStatus,
  JobType,
} from "./types";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  not_started: "Not Started",
  travelling: "Travelling",
  on_site: "On Site",
  completed: "Completed",
  awaiting_parts: "Awaiting Parts",
  cancelled: "Cancelled",
};

/** Tailwind classes for job status chips (dark theme). */
export const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  not_started: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  travelling: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  on_site: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  awaiting_parts: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  cancelled: "bg-zinc-600/15 text-zinc-500 border-zinc-600/30",
};

export const JOB_PRIORITY_LABELS: Record<JobPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  emergency: "Emergency",
};

export const JOB_PRIORITY_STYLES: Record<JobPriority, string> = {
  low: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  medium: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  high: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  emergency: "bg-red-500/15 text-red-400 border-red-500/40",
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  annual_service: "Annual Service",
  inspection: "Inspection",
  installation: "Installation",
  repair: "Repair",
  callout: "Call-Out",
  refill: "Refill",
  pressure_test: "Pressure Test",
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  fire_extinguisher: "Fire Extinguisher",
  hose_reel: "Hose Reel",
  hydrant: "Hydrant",
  fire_blanket: "Fire Blanket",
  signage: "Signage",
  fire_detection: "Fire Detection",
  co2_unit: "CO2 Unit",
  dcp_unit: "DCP Unit",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  compliant: "Compliant",
  defective: "Defective",
  removed: "Removed",
  replaced: "Replaced",
  missing: "Missing",
};

export const ASSET_STATUS_STYLES: Record<AssetStatus, string> = {
  compliant: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  defective: "bg-red-500/15 text-red-400 border-red-500/40",
  removed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  replaced: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  missing: "bg-amber-500/15 text-amber-400 border-amber-500/40",
};

export const DEFECT_SEVERITY_LABELS: Record<DefectSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const DEFECT_SEVERITY_STYLES: Record<DefectSeverity, string> = {
  low: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  medium: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  high: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/40",
};

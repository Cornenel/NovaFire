import type {
  AssetStatus,
  AssetType,
  DefectSeverity,
  JobPriority,
  JobStatus,
  JobType,
} from "./types";
import {
  ZOHO_ANNUAL_SERVICE_CATEGORY,
  ZOHO_IMPORT_SOURCE,
} from "@/lib/imports/zoho-jobcard";

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

export const IMPORT_SOURCE_LABELS: Record<string, string> = {
  zoho_import: "Zoho Forms Import",
};

export function importSourceLabel(source: string | null | undefined): string | null {
  if (!source) return null;
  return IMPORT_SOURCE_LABELS[source] ?? source;
}

/** Zoho historical jobcards are annual services unless explicitly classified otherwise. */
export function resolveJobTypeLabel(job: {
  job_type: JobType;
  import_source?: string | null;
  service_category?: string | null;
}): string {
  if (job.import_source === ZOHO_IMPORT_SOURCE) {
    if (
      job.job_type === "inspection" &&
      job.service_category &&
      job.service_category !== ZOHO_ANNUAL_SERVICE_CATEGORY
    ) {
      return JOB_TYPE_LABELS.inspection;
    }
    return JOB_TYPE_LABELS.annual_service;
  }
  return JOB_TYPE_LABELS[job.job_type];
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  fire_extinguisher: "Fire Extinguisher",
  hose_reel: "Hose Reel",
  hydrant: "Hydrant",
  fire_blanket: "Fire Blanket",
  signage: "Signage",
  fire_detection: "Fire Detection",
  // Legacy enum values kept for backward compatibility only. The app no
  // longer creates or displays DCP/CO2 as top-level asset types.
  co2_unit: "Fire Extinguisher",
  dcp_unit: "Fire Extinguisher",
};

export const MAIN_ASSET_TYPE_LABELS: Partial<Record<AssetType, string>> = {
  fire_extinguisher: "Fire Extinguisher",
  hose_reel: "Hose Reel",
  hydrant: "Hydrant",
  fire_blanket: "Fire Blanket",
  signage: "Signage",
  fire_detection: "Fire Detection",
};

export const FIRE_EXTINGUISHER_MEDIUMS = [
  "DCP",
  "CO2",
  "Foam",
  "Water",
  "Wet Chemical",
  "Other",
] as const;

export const FIRE_EXTINGUISHER_CAPACITIES = [
  "1kg",
  "2kg",
  "2.5kg",
  "4.5kg",
  "5kg",
  "6kg",
  "9kg",
  "25kg",
  "50kg",
  "Other",
] as const;

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

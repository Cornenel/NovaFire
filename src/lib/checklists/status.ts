import type { StoredCheckAnswer, OverallEquipmentResult } from "@/lib/checklists/types";

export type JobAssetChecklistStatus = {
  assetId: string;
  status: string | null;
  displayStatus:
    | "not_started"
    | "in_progress"
    | "complete"
    | "complete_with_defects"
    | "unable_to_complete";
};

export function mapDbAnswers(
  rows: Array<{
    section_key: string;
    check_key: string;
    label: string;
    result: string;
    value_text: string | null;
    value_number: number | null;
    unit: string | null;
    notes: string | null;
    photo_urls: string[];
    requires_action: boolean;
    defect_severity: string | null;
  }>
): StoredCheckAnswer[] {
  return rows.map((row) => ({
    sectionKey: row.section_key,
    checkKey: row.check_key,
    label: row.label,
    result: row.result as StoredCheckAnswer["result"],
    valueText: row.value_text,
    valueNumber: row.value_number,
    unit: row.unit,
    notes: row.notes,
    photoUrls: row.photo_urls ?? [],
    requiresAction: row.requires_action,
    defectSeverity: row.defect_severity as StoredCheckAnswer["defectSeverity"],
  }));
}

export function toDisplayStatus(
  dbStatus: string | null,
  inspected: boolean
): JobAssetChecklistStatus["displayStatus"] {
  if (!dbStatus && !inspected) return "not_started";
  if (!dbStatus && inspected) return "complete";
  switch (dbStatus) {
    case "draft":
    case "in_progress":
    case "reopened":
      return "in_progress";
    case "complete":
      return "complete";
    case "complete_with_defects":
      return "complete_with_defects";
    case "unable_to_complete":
      return "unable_to_complete";
    default:
      return inspected ? "complete" : "not_started";
  }
}

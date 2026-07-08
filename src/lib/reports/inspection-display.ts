/** Shared helpers for inspection parts / follow-up display on reports. */

type Checklist = Record<string, boolean | string | string[] | null | undefined>;

const COMPLETED_PARTS_KEYWORDS = [
  "refill",
  "recharge",
  "powder",
  "nitrogen",
  "operating head",
  "discharge hose",
  "valve",
];

function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

export function partsUsedFromInspectionChecklist(checklist: Checklist): string | null {
  const serviceParts = checklist.service_parts_used;
  if (Array.isArray(serviceParts) && serviceParts.length > 0) {
    return serviceParts.map(String).filter(Boolean).join(", ");
  }

  const raw =
    (typeof checklist.replacement_parts_used_raw === "string"
      ? checklist.replacement_parts_used_raw
      : null) ??
    (typeof checklist.replacement_parts_used === "string"
      ? checklist.replacement_parts_used
      : null);

  return raw?.trim() || null;
}

/** True only when a refill is still outstanding — not when parts used show it was done. */
export function inspectionRefillStillRequired(
  requiresRefill: boolean,
  checklist: Checklist,
  notes?: string | null
): boolean {
  if (!requiresRefill) return false;

  const parts = partsUsedFromInspectionChecklist(checklist);
  if (parts && containsKeyword(parts, COMPLETED_PARTS_KEYWORDS)) {
    return false;
  }

  const combined = [parts, notes].filter(Boolean).join(" ");
  if (combined && containsKeyword(combined, COMPLETED_PARTS_KEYWORDS)) {
    return false;
  }

  return true;
}

export function formatPartsUsedAndNotes(input: {
  checklist: Checklist;
  requiresRefill: boolean;
  requiresPressureTest: boolean;
  notes: string | null;
  failedChecklistSummary?: string | null;
}): string {
  const segments: string[] = [];

  const parts = partsUsedFromInspectionChecklist(input.checklist);
  if (parts) {
    segments.push(`Parts used: ${parts}`);
  }

  if (input.requiresPressureTest) {
    segments.push("Pressure testing required");
  }

  if (inspectionRefillStillRequired(input.requiresRefill, input.checklist, input.notes)) {
    segments.push("Refill required");
  }

  if (input.failedChecklistSummary) {
    segments.push(input.failedChecklistSummary);
  }

  const note = input.notes?.trim();
  if (note) {
    const partsNorm = parts?.toLowerCase() ?? "";
    const noteNorm = note.toLowerCase();
    if (!partsNorm || (noteNorm !== partsNorm && !partsNorm.includes(noteNorm))) {
      segments.push(note);
    }
  }

  return segments.join(" · ") || "—";
}

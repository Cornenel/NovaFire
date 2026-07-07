/**
 * Phase 22: Historical customer / site / asset / service records.
 *
 * Pure helpers – no database writes. Ensures current asset state reflects the
 * latest inspection while preserving full historical rows.
 */

import { evaluateExistingAssetCompliance } from "@/lib/compliance/recheck";
import type { AssetEventType, AssetStatus, InspectionResult } from "./types";

export interface HistoricalCustomer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface HistoricalInspection {
  id: string;
  created_at: string;
  result: InspectionResult;
  notes?: string | null;
  requires_refill?: boolean;
  requires_pressure_test?: boolean;
  job_id: string;
  job?: {
    id?: string;
    job_number?: string | null;
    status?: string | null;
    scheduled_date?: string | null;
    completed_at?: string | null;
  } | null;
}

export interface HistoricalDefect {
  id: string;
  created_at: string;
  updated_at: string;
  defect_type: string;
  description: string;
  severity?: string;
  status: string;
  job_id: string;
}

export interface HistoricalAssetEvent {
  id: string;
  created_at: string;
  event_type: AssetEventType;
  job_id?: string | null;
  details?: Record<string, unknown> | null;
}

export interface HistoricalPhoto {
  id: string;
  taken_at: string;
  stage: string;
  job_id: string;
}

export interface HistoricalAsset {
  id: string;
  asset_code: string;
  customer_asset_number?: string | null;
  manufacture_date?: string | null;
  created_at: string;
  last_service_date?: string | null;
  next_service_date?: string | null;
  annual_service_due_date?: string | null;
  status?: AssetStatus | string | null;
}

export type AssetTimelineKind =
  | "installed"
  | "serviced"
  | "inspection"
  | "defect"
  | "repair"
  | "refill"
  | "pressure_test"
  | "replacement"
  | "removed"
  | "missing"
  | "photo"
  | "report"
  | "status_change"
  | "next_service";

export interface AssetTimelineEntry {
  id: string;
  kind: AssetTimelineKind;
  /** ISO date (YYYY-MM-DD) used for ordering */
  date: string;
  sortAt: string;
  title: string;
  detail?: string;
  jobId?: string;
  jobNumber?: string;
  reportHref?: string;
  tone?: "neutral" | "positive" | "warning" | "danger" | "future";
}

const RESOLVED_DEFECT_STATUSES = new Set(["resolved", "closed"]);

const EVENT_KIND_MAP: Partial<Record<AssetEventType, AssetTimelineKind>> = {
  installed: "installed",
  serviced: "serviced",
  inspected: "inspection",
  defect_reported: "defect",
  refilled: "refill",
  replaced: "replacement",
  removed: "removed",
  marked_missing: "missing",
  status_changed: "status_change",
};

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const email = (value ?? "").trim().toLowerCase();
  return email || null;
}

export function normalizePhone(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits || null;
}

/** Match an existing customer without creating duplicates during imports. */
export function matchExistingCustomer(
  customers: HistoricalCustomer[],
  input: {
    name: string;
    email?: string | null;
    phone?: string | null;
  }
): HistoricalCustomer | null {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const normalizedName = normalizeText(input.name);

  return (
    (email && customers.find((c) => normalizeEmail(c.email) === email)) ||
    customers.find((c) => normalizeText(c.name) === normalizedName) ||
    (phone && customers.find((c) => normalizePhone(c.phone) === phone)) ||
    null
  );
}

export function inspectionEffectiveDate(inspection: HistoricalInspection): string {
  const job = inspection.job;
  if (job?.completed_at) return job.completed_at.slice(0, 10);
  if (job?.scheduled_date) return job.scheduled_date;
  return inspection.created_at.slice(0, 10);
}

/** Pick the chronologically latest inspection for current-state calculations. */
export function pickLatestInspection<T extends HistoricalInspection>(
  inspections: T[]
): T | null {
  if (inspections.length === 0) return null;
  return [...inspections].sort((a, b) => {
    const dateCmp = inspectionEffectiveDate(b).localeCompare(
      inspectionEffectiveDate(a)
    );
    if (dateCmp !== 0) return dateCmp;
    return b.created_at.localeCompare(a.created_at);
  })[0];
}

export function buildAssetUpdateFromLatestInspection(
  asset: HistoricalAsset,
  latestInspection: HistoricalInspection,
  openDefects: Array<{
    status: string;
    severity: string;
    description: string;
    defect_type: string;
    recommended_action?: string | null;
  }> = []
) {
  const serviceDate = inspectionEffectiveDate(latestInspection);
  const hasOpenDefects = openDefects.some((d) => !RESOLVED_DEFECT_STATUSES.has(d.status));
  const status: AssetStatus = hasOpenDefects
    ? "defective"
    : latestInspection.result === "pass"
      ? "compliant"
      : "defective";

  const evaluation = evaluateExistingAssetCompliance({
    asset: {
      ...asset,
      last_service_date: serviceDate,
      status,
    },
    latestInspection,
    unresolvedDefects: openDefects.map((defect) => ({
      status: defect.status,
      severity: defect.severity,
      description: defect.description,
      defectType: defect.defect_type,
      recommendedAction: defect.recommended_action,
    })),
  });

  const nextServiceDate =
    evaluation.result.calculatedDates.annualServiceDueDate ??
    asset.next_service_date ??
    null;

  return {
    last_service_date: serviceDate,
    next_service_date: nextServiceDate,
    status,
    calculated_compliance_status: evaluation.payload.calculated_compliance_status,
    compliance_reasons: evaluation.payload.compliance_reasons,
    compliance_next_actions: evaluation.payload.compliance_next_actions,
    compliance_source_fields: evaluation.payload.compliance_source_fields,
    compliance_calculated_at: evaluation.payload.compliance_calculated_at,
    annual_service_due_date: evaluation.payload.annual_service_due_date,
    pressure_test_due_date: evaluation.payload.pressure_test_due_date,
    hydro_test_due_date: evaluation.payload.hydro_test_due_date,
  };
}

export function buildAssetTimeline(input: {
  asset: HistoricalAsset;
  inspections: HistoricalInspection[];
  defects: HistoricalDefect[];
  events: HistoricalAssetEvent[];
  photos: HistoricalPhoto[];
}): AssetTimelineEntry[] {
  const entries: AssetTimelineEntry[] = [];
  const inspectionJobIds = new Set(input.inspections.map((i) => i.job_id));

  const installedEvent = input.events.find((e) => e.event_type === "installed");
  const installedDate =
    installedEvent?.created_at.slice(0, 10) ??
    input.asset.manufacture_date ??
    input.asset.created_at.slice(0, 10);

  entries.push({
    id: `installed-${input.asset.id}`,
    kind: "installed",
    date: installedDate,
    sortAt: `${installedDate}T00:00:00.000Z`,
    title: "Installed",
    tone: "neutral",
  });

  for (const inspection of input.inspections) {
    const date = inspectionEffectiveDate(inspection);
    const jobNumber = inspection.job?.job_number ?? undefined;
    const servicedTitle =
      inspection.result === "pass" ? "Serviced" : "Inspection failed";

    entries.push({
      id: `inspection-${inspection.id}`,
      kind: inspection.result === "pass" ? "serviced" : "inspection",
      date,
      sortAt: inspection.created_at,
      title: servicedTitle,
      detail: inspection.notes ?? undefined,
      jobId: inspection.job_id,
      jobNumber,
      tone: inspection.result === "pass" ? "positive" : "danger",
    });

    if (inspection.requires_pressure_test) {
      entries.push({
        id: `pressure-${inspection.id}`,
        kind: "pressure_test",
        date,
        sortAt: `${inspection.created_at}-pressure`,
        title: "Pressure test required",
        detail: inspection.result === "pass" ? "Passed" : "Required after failed inspection",
        jobId: inspection.job_id,
        jobNumber,
        tone: inspection.result === "pass" ? "positive" : "warning",
      });
    }
  }

  for (const defect of input.defects) {
    const date = defect.created_at.slice(0, 10);
    entries.push({
      id: `defect-${defect.id}`,
      kind: "defect",
      date,
      sortAt: defect.created_at,
      title: `Defect: ${defect.defect_type}`,
      detail: defect.description,
      jobId: defect.job_id,
      tone: "danger",
    });

    if (RESOLVED_DEFECT_STATUSES.has(defect.status)) {
      entries.push({
        id: `repair-${defect.id}`,
        kind: "repair",
        date: defect.updated_at.slice(0, 10),
        sortAt: defect.updated_at,
        title: "Repair",
        detail: defect.description,
        jobId: defect.job_id,
        tone: "positive",
      });
    }
  }

  for (const event of input.events) {
    if (event.event_type === "installed") continue;
    if (event.event_type === "inspected" || event.event_type === "serviced") continue;
    if (event.event_type === "defect_reported" && event.job_id && inspectionJobIds.has(event.job_id)) {
      continue;
    }

    const kind = EVENT_KIND_MAP[event.event_type];
    if (!kind) continue;

    const date = event.created_at.slice(0, 10);
    const title =
      kind === "refill"
        ? "Repair: Refilled"
        : kind === "replacement"
          ? "Replacement"
          : kind === "removed"
            ? "Removed from site"
            : kind === "missing"
              ? "Marked missing"
              : kind === "status_change"
                ? "Status changed"
                : "Defect reported";

    entries.push({
      id: `event-${event.id}`,
      kind,
      date,
      sortAt: event.created_at,
      title,
      jobId: event.job_id ?? undefined,
      tone:
        kind === "refill" || kind === "replacement"
          ? "positive"
          : kind === "defect"
            ? "danger"
            : "neutral",
    });
  }

  for (const photo of input.photos) {
    entries.push({
      id: `photo-${photo.id}`,
      kind: "photo",
      date: photo.taken_at.slice(0, 10),
      sortAt: photo.taken_at,
      title: "Photo",
      detail: photo.stage,
      jobId: photo.job_id,
      tone: "neutral",
    });
  }

  const reportJobs = new Map<string, { jobNumber?: string; date: string; sortAt: string }>();
  for (const inspection of input.inspections) {
    if (!inspection.job_id) continue;
    const job = inspection.job;
    if (job?.status && job.status !== "completed" && job.status !== "cancelled") {
      continue;
    }
    const date = inspectionEffectiveDate(inspection);
    reportJobs.set(inspection.job_id, {
      jobNumber: job?.job_number ?? undefined,
      date,
      sortAt: inspection.created_at,
    });
  }

  for (const [jobId, meta] of reportJobs) {
    entries.push({
      id: `report-${jobId}`,
      kind: "report",
      date: meta.date,
      sortAt: `${meta.sortAt}-report`,
      title: "Service report / certificate",
      jobId,
      jobNumber: meta.jobNumber,
      reportHref: `/api/reports/${jobId}`,
      tone: "neutral",
    });
  }

  entries.sort((a, b) => {
    const cmp = a.sortAt.localeCompare(b.sortAt);
    if (cmp !== 0) return cmp;
    return a.id.localeCompare(b.id);
  });

  const nextDue = input.asset.next_service_date ?? input.asset.annual_service_due_date;
  if (nextDue) {
    entries.push({
      id: `next-service-${input.asset.id}`,
      kind: "next_service",
      date: nextDue,
      sortAt: `9999-${nextDue}`,
      title: "Next service due",
      detail: formatMonthYear(nextDue),
      tone: "future",
    });
  }

  return entries;
}

function formatMonthYear(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    month: "short",
    year: "numeric",
  });
}

/**
 * Server-side helpers to keep asset current state aligned with the latest
 * inspection while preserving historical rows.
 */

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  buildAssetUpdateFromLatestInspection,
  pickLatestInspection,
  type HistoricalInspection,
} from "./historical-records";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function syncAssetCurrentStateFromHistory(
  admin: AdminClient,
  assetId: string
): Promise<void> {
  const { data: asset } = await admin
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) return;

  const [{ data: inspections }, { data: defects }] = await Promise.all([
    admin
      .from("inspections")
      .select(
        "id, created_at, result, notes, requires_refill, requires_pressure_test, job_id, job:jobs(id, job_number, status, scheduled_date, completed_at, legacy_technician_saqcc, legacy_zoho_jobcard_id, import_source)"
      )
      .eq("asset_id", assetId),
    admin
      .from("defects")
      .select(
        "id, created_at, updated_at, defect_type, description, status, recommended_action, severity, job_id"
      )
      .eq("asset_id", assetId),
  ]);

  const latest = pickLatestInspection(
    (inspections ?? []) as HistoricalInspection[]
  );
  if (!latest) return;

  const update = buildAssetUpdateFromLatestInspection(
    asset,
    latest,
    (defects ?? []).map((defect) => ({
      status: defect.status,
      severity: defect.severity ?? "medium",
      description: defect.description,
      defect_type: defect.defect_type,
      recommended_action: defect.recommended_action,
    }))
  );

  await admin.from("assets").update(update).eq("id", assetId);
}

export async function recordImportedInspectionHistory(
  admin: AdminClient,
  input: {
    assetId: string;
    jobId: string;
    technicianId: string;
    inspectionId: string;
    result: "pass" | "fail";
  }
): Promise<void> {
  await admin.from("asset_events").insert({
    asset_id: input.assetId,
    job_id: input.jobId,
    technician_id: input.technicianId,
    event_type: input.result === "pass" ? "serviced" : "inspected",
    details: {
      inspection_id: input.inspectionId,
      import_source: "zoho_import",
    },
  });

  await syncAssetCurrentStateFromHistory(admin, input.assetId);
}

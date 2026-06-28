"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  evaluateExistingAssetCompliance,
  type RecheckAssetInput,
  type RecheckInspectionInput,
} from "@/lib/compliance/recheck";
import type { ComplianceDefectInput, FireComplianceStatus } from "@/lib/compliance/fireCompliance";

export interface ComplianceRecheckState {
  ok: boolean;
  error?: string;
  summary?: ComplianceRecheckSummary;
}

export interface ComplianceRecheckSummary {
  checked: number;
  updated: number;
  changedNonCompliantToCompliant: number;
  compliant: number;
  nonCompliant: number;
  warning: number;
  unknown: number;
  reasonCounts: Record<string, number>;
}

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/tech-login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active || profile.role !== "admin") {
    redirect("/tech-restricted");
  }

  return user;
}

export async function recheckExistingCompliance(
  _prevState: ComplianceRecheckState
): Promise<ComplianceRecheckState> {
  try {
    const user = await requireAdminUser();
    const admin = createAdminClient();
    const calculatedAt = new Date().toISOString();

    const { data: assetsData, error: assetsError } = await admin
      .from("assets")
      .select("*")
      .in("asset_type", ["fire_extinguisher", "co2_unit", "dcp_unit"]);

    if (assetsError) throw new Error(assetsError.message);
    const assets = (assetsData ?? []) as RecheckAssetInput[];
    const assetIds = assets.map((asset) => asset.id);

    if (assetIds.length === 0) {
      return {
        ok: true,
        summary: emptySummary(),
      };
    }

    const [{ data: inspectionsData }, { data: defectsData }] = await Promise.all([
      admin
        .from("inspections")
        .select(
          "id, asset_id, result, notes, created_at, checklist, requires_pressure_test, legacy_zoho_jobcard_id, import_raw_data, job:jobs(id, status, scheduled_date, completed_at, legacy_technician_saqcc, legacy_zoho_jobcard_id, import_source)"
        )
        .in("asset_id", assetIds)
        .order("created_at", { ascending: false }),
      admin
        .from("defects")
        .select("asset_id, status, severity, description, defect_type, recommended_action")
        .in("asset_id", assetIds)
        .in("status", ["open", "quote_sent", "in_progress"]),
    ]);

    const latestInspectionByAsset = new Map<string, RecheckInspectionInput>();
    const latestJobIds = new Set<string>();
    for (const inspection of (inspectionsData ?? []) as Array<
      RecheckInspectionInput & { asset_id: string }
    >) {
      if (!latestInspectionByAsset.has(inspection.asset_id)) {
        latestInspectionByAsset.set(inspection.asset_id, inspection);
        if (inspection.job?.id) latestJobIds.add(inspection.job.id);
      }
    }

    const reportsByJob = new Map<string, Array<{ id: string; report_type: string }>>();
    if (latestJobIds.size > 0) {
      const { data: reportsData } = await admin
        .from("reports")
        .select("id, job_id, report_type")
        .in("job_id", [...latestJobIds]);
      for (const report of (reportsData ?? []) as Array<{
        id: string;
        job_id: string;
        report_type: string;
      }>) {
        const list = reportsByJob.get(report.job_id) ?? [];
        list.push({ id: report.id, report_type: report.report_type });
        reportsByJob.set(report.job_id, list);
      }
    }

    const defectsByAsset = new Map<string, ComplianceDefectInput[]>();
    for (const defect of (defectsData ?? []) as Array<
      ComplianceDefectInput & {
        asset_id: string;
        defect_type?: string | null;
        recommended_action?: string | null;
      }
    >) {
      const list = defectsByAsset.get(defect.asset_id) ?? [];
      list.push({
        status: defect.status,
        severity: defect.severity,
        description: defect.description,
        defectType: defect.defect_type,
        recommendedAction: defect.recommended_action,
      });
      defectsByAsset.set(defect.asset_id, list);
    }

    const summary = emptySummary();

    for (const asset of assets) {
      const evaluation = evaluateExistingAssetCompliance(
        {
          asset,
          latestInspection: latestInspectionByAsset.get(asset.id),
          unresolvedDefects: defectsByAsset.get(asset.id) ?? [],
        },
        calculatedAt
      );

      summary.checked++;
      incrementStatus(summary, evaluation.result.status);
      for (const reason of evaluation.result.reasons) {
        summary.reasonCounts[reason] = (summary.reasonCounts[reason] ?? 0) + 1;
      }

      if (!evaluation.changed) continue;
      const jobId = evaluation.history.source_reference.job_id;
      if (typeof jobId === "string") {
        evaluation.history.source_reference.reports = reportsByJob.get(jobId) ?? [];
      }

      const { error: updateError } = await admin
        .from("assets")
        .update(evaluation.payload)
        .eq("id", asset.id);
      if (updateError) throw new Error(updateError.message);

      const { error: historyError } = await admin
        .from("asset_compliance_recheck_history")
        .insert({
          ...evaluation.history,
          created_by: user.id,
        });
      if (historyError) throw new Error(historyError.message);

      summary.updated++;
      if (
        evaluation.history.previous_calculated_status === "NON_COMPLIANT" &&
        evaluation.history.new_calculated_status === "COMPLIANT"
      ) {
        summary.changedNonCompliantToCompliant++;
      }
    }

    revalidatePath("/admin/compliance");
    revalidatePath("/admin/sites");
    return { ok: true, summary };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not recheck existing compliance records.",
    };
  }
}

function emptySummary(): ComplianceRecheckSummary {
  return {
    checked: 0,
    updated: 0,
    changedNonCompliantToCompliant: 0,
    compliant: 0,
    nonCompliant: 0,
    warning: 0,
    unknown: 0,
    reasonCounts: {},
  };
}

function incrementStatus(
  summary: ComplianceRecheckSummary,
  status: FireComplianceStatus
) {
  if (status === "COMPLIANT") summary.compliant++;
  if (status === "NON_COMPLIANT") summary.nonCompliant++;
  if (status === "WARNING") summary.warning++;
  if (status === "UNKNOWN") summary.unknown++;
}

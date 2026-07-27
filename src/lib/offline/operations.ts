/**
 * Offline-capable operations for the technician app.
 *
 * Each operation is a serialisable description (Blobs included – IndexedDB
 * stores them natively) executed against the browser Supabase client, so it
 * can run immediately when online or be queued and replayed later.
 *
 * All row IDs are generated client-side (UUIDs) so replays are idempotent.
 */

import { createClient } from "@/lib/supabase/client";
import {
  buildAssetUpdateFromLatestInspection,
  pickLatestInspection,
} from "@/lib/fsm/historical-records";
import { CHECKLIST_VERSION } from "@/lib/checklists/version";

async function persistChecklistAnswers(
  supabase: ReturnType<typeof createClient>,
  checklistId: string,
  answers: Array<{
    sectionKey: string;
    checkKey: string;
    label: string;
    result: string;
    valueText?: string | null;
    valueNumber?: number | null;
    unit?: string | null;
    notes?: string | null;
    photoUrls?: string[];
    requiresAction?: boolean;
    defectSeverity?: string | null;
  }>
) {
  for (const answer of answers) {
    const { error } = await supabase.from("inspection_checklist_answers").upsert(
      {
        checklist_id: checklistId,
        section_key: answer.sectionKey,
        check_key: answer.checkKey,
        label: answer.label,
        result: answer.result,
        value_text: answer.valueText ?? null,
        value_number: answer.valueNumber ?? null,
        unit: answer.unit ?? null,
        notes: answer.notes ?? null,
        photo_urls: answer.photoUrls ?? [],
        requires_action: answer.requiresAction ?? false,
        defect_severity: answer.defectSeverity ?? null,
      },
      { onConflict: "checklist_id,section_key,check_key" }
    );
    throwIfError(error, "Checklist answer");
  }
}

/** Reuse the DB checklist row for this job/asset/version (avoids duplicate-key errors). */
async function findChecklistIdByJobAsset(
  supabase: ReturnType<typeof createClient>,
  payload: { jobId: string; assetId: string }
): Promise<string | null> {
  const { data, error } = await supabase
    .from("inspection_checklists")
    .select("id")
    .eq("job_id", payload.jobId)
    .eq("asset_id", payload.assetId)
    .eq("checklist_version", CHECKLIST_VERSION)
    .maybeSingle();

  throwIfError(error, "Checklist lookup");
  return data?.id ?? null;
}

type ChecklistHeaderFields = {
  asset_type: string;
  status: string;
  started_at: string;
  completed_at?: string | null;
  completed_by: string;
  overall_result?: string | null;
  notes?: string | null;
  final_condition_confirmed?: boolean;
  customer_informed?: boolean;
  inspection_id?: string | null;
};

function isDuplicateKeyError(error: { code?: string; message: string } | null) {
  return (
    error?.code === "23505" ||
    (error?.message ?? "").includes("duplicate key value")
  );
}

/**
 * Insert or update the checklist header by job/asset/version — never by client id alone.
 * Upsert onConflict:"id" fails when the client UUID differs from the existing row.
 */
async function saveChecklistHeader(
  supabase: ReturnType<typeof createClient>,
  payload: { checklistId: string; jobId: string; assetId: string },
  fields: ChecklistHeaderFields,
  context: string
): Promise<string> {
  let existingId = await findChecklistIdByJobAsset(supabase, payload);
  const checklistId = existingId ?? payload.checklistId;

  const row = {
    job_id: payload.jobId,
    asset_id: payload.assetId,
    checklist_version: CHECKLIST_VERSION,
    ...fields,
  };

  if (existingId) {
    const { error } = await supabase
      .from("inspection_checklists")
      .update(row)
      .eq("id", existingId);
    throwIfError(error, context);
    return existingId;
  }

  const { error: insertError } = await supabase
    .from("inspection_checklists")
    .insert({ id: checklistId, ...row });

  if (isDuplicateKeyError(insertError)) {
    existingId = await findChecklistIdByJobAsset(supabase, payload);
    if (!existingId) throw new Error(`${context}: duplicate key but row not found`);
    const { error: updateError } = await supabase
      .from("inspection_checklists")
      .update(row)
      .eq("id", existingId);
    throwIfError(updateError, context);
    return existingId;
  }

  throwIfError(insertError, context);
  return checklistId;
}

export type OfflineOp =
  | {
      type: "job_status";
      payload: {
        jobId: string;
        fields: Record<string, string | number | null>;
      };
    }
  | {
      type: "inspection";
      payload: {
        id: string;
        jobId: string;
        assetId: string;
        technicianId: string;
        assetType: string;
        checklist: Record<string, boolean>;
        result: "pass" | "fail";
        requiresRefill: boolean;
        requiresPressureTest: boolean;
        notes: string | null;
        serviceDate: string;
        nextServiceDate: string;
      };
    }
  | {
      type: "defect";
      payload: {
        id: string;
        jobId: string;
        assetId: string;
        technicianId: string;
        defectType: string;
        severity: string;
        description: string;
        recommendedAction: string | null;
        quoteRequired: boolean;
      };
    }
  | {
      type: "asset_action";
      payload: {
        assetId: string;
        jobId: string | null;
        technicianId: string;
        action: "refilled" | "replaced" | "removed" | "marked_missing";
        fields: Record<string, string | null>;
      };
    }
  | {
      type: "fire_risk";
      payload: {
        id: string;
        jobId: string;
        customerId: string;
        siteId: string;
        technicianId: string;
        riskType: string;
        severity: string;
        locationDescription: string | null;
        description: string;
        recommendedAction: string | null;
      };
    }
  | {
      type: "photo";
      payload: {
        id: string;
        jobId: string;
        assetId: string | null;
        defectId: string | null;
        inspectionId: string | null;
        technicianId: string;
        storagePath: string;
        stage: string;
        latitude: number | null;
        longitude: number | null;
        takenAt: string;
        blob: Blob;
        contentType: string;
      };
    }
  | {
      type: "signature_complete";
      payload: {
        jobId: string;
        signerName: string;
        signerTitle: string | null;
        storagePath: string;
        latitude: number | null;
        longitude: number | null;
        signedAt: string;
        completedAt: string;
        blob: Blob;
      };
    }
  | {
      type: "stock_usage";
      payload: {
        jobId: string;
        technicianId: string;
        items: Array<{ stockItemId: string; quantity: number }>;
      };
    }
  | {
      type: "checklist_draft";
      payload: {
        checklistId: string;
        jobId: string;
        assetId: string;
        assetType: string;
        technicianId: string;
        answers: Array<{
          sectionKey: string;
          checkKey: string;
          label: string;
          result: string;
          valueText?: string | null;
          valueNumber?: number | null;
          unit?: string | null;
          notes?: string | null;
          photoUrls?: string[];
          requiresAction?: boolean;
          defectSeverity?: string | null;
        }>;
        overallResult?: string | null;
        notes?: string | null;
        finalConditionConfirmed?: boolean;
        customerInformed?: boolean;
      };
    }
  | {
      type: "checklist_complete";
      payload: {
        checklistId: string;
        jobId: string;
        assetId: string;
        assetType: string;
        technicianId: string;
        answers: Array<{
          sectionKey: string;
          checkKey: string;
          label: string;
          result: string;
          valueText?: string | null;
          valueNumber?: number | null;
          unit?: string | null;
          notes?: string | null;
          photoUrls?: string[];
          requiresAction?: boolean;
          defectSeverity?: string | null;
        }>;
        overallResult: string;
        notes?: string | null;
        finalConditionConfirmed: boolean;
        customerInformed: boolean;
        inspectionId: string;
        legacyChecklist: Record<string, boolean>;
        inspectionResult: "pass" | "fail";
        requiresRefill: boolean;
        requiresPressureTest: boolean;
        serviceDate: string;
        nextServiceDate: string;
        defects: Array<{
          id: string;
          defectType: string;
          severity: string;
          description: string;
          recommendedAction: string | null;
          quoteRequired: boolean;
        }>;
      };
    };

function throwIfError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

/** Executes an operation now. Throws on failure (network errors included). */
export async function executeOp(op: OfflineOp): Promise<void> {
  const supabase = createClient();

  switch (op.type) {
    case "job_status": {
      const { error } = await supabase
        .from("jobs")
        .update(op.payload.fields)
        .eq("id", op.payload.jobId);
      throwIfError(error, "Job update");
      break;
    }

    case "inspection": {
      const p = op.payload;
      const { error } = await supabase.from("inspections").upsert(
        {
          id: p.id,
          job_id: p.jobId,
          asset_id: p.assetId,
          technician_id: p.technicianId,
          asset_type: p.assetType,
          checklist: p.checklist,
          result: p.result,
          requires_refill: p.requiresRefill,
          requires_pressure_test: p.requiresPressureTest,
          notes: p.notes,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
      throwIfError(error, "Inspection");

      const { data: existingInspections } = await supabase
        .from("inspections")
        .select(
          "id, created_at, result, notes, requires_refill, requires_pressure_test, job_id, job:jobs(id, job_number, status, scheduled_date, completed_at)"
        )
        .eq("asset_id", p.assetId);

      const latest = pickLatestInspection([
        ...((existingInspections ?? []) as Array<{
          id: string;
          created_at: string;
          result: "pass" | "fail";
          notes: string | null;
          requires_refill: boolean;
          requires_pressure_test: boolean;
          job_id: string;
          job?: {
            id?: string;
            job_number?: string | null;
            status?: string | null;
            scheduled_date?: string | null;
            completed_at?: string | null;
          } | null;
        }>),
        {
          id: p.id,
          created_at: new Date().toISOString(),
          result: p.result,
          notes: p.notes,
          requires_refill: p.requiresRefill,
          requires_pressure_test: p.requiresPressureTest,
          job_id: p.jobId,
          job: { scheduled_date: p.serviceDate },
        },
      ]);

      if (latest?.id === p.id) {
        const { data: assetRow } = await supabase
          .from("assets")
          .select("*")
          .eq("id", p.assetId)
          .single();

        const { data: openDefects } = await supabase
          .from("defects")
          .select("status, severity, description, defect_type, recommended_action")
          .eq("asset_id", p.assetId)
          .eq("status", "open");

        if (assetRow) {
          const update = buildAssetUpdateFromLatestInspection(
            assetRow,
            {
              id: p.id,
              created_at: new Date().toISOString(),
              result: p.result,
              notes: p.notes,
              requires_refill: p.requiresRefill,
              requires_pressure_test: p.requiresPressureTest,
              job_id: p.jobId,
              job: { scheduled_date: p.serviceDate },
            },
            openDefects ?? []
          );

          await supabase.from("assets").update(update).eq("id", p.assetId);
        }
      }

      await supabase.from("asset_events").insert({
        asset_id: p.assetId,
        job_id: p.jobId,
        technician_id: p.technicianId,
        event_type: p.result === "pass" ? "serviced" : "inspected",
        details: {
          result: p.result,
          requires_refill: p.requiresRefill,
          inspection_id: p.id,
        },
      });
      break;
    }

    case "defect": {
      const p = op.payload;
      const { error } = await supabase.from("defects").upsert(
        {
          id: p.id,
          job_id: p.jobId,
          asset_id: p.assetId,
          technician_id: p.technicianId,
          defect_type: p.defectType,
          severity: p.severity,
          description: p.description,
          recommended_action: p.recommendedAction,
          quote_required: p.quoteRequired,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
      throwIfError(error, "Defect");

      await supabase
        .from("assets")
        .update({ status: "defective" })
        .eq("id", p.assetId);

      await supabase.from("asset_events").insert({
        asset_id: p.assetId,
        job_id: p.jobId,
        technician_id: p.technicianId,
        event_type: "defect_reported",
        details: { defect_type: p.defectType, severity: p.severity },
      });
      break;
    }

    case "asset_action": {
      const p = op.payload;
      const { error } = await supabase
        .from("assets")
        .update(p.fields)
        .eq("id", p.assetId);
      throwIfError(error, "Asset update");

      await supabase.from("asset_events").insert({
        asset_id: p.assetId,
        job_id: p.jobId,
        technician_id: p.technicianId,
        event_type: p.action,
        details: {},
      });
      break;
    }

    case "fire_risk": {
      const p = op.payload;
      const { error } = await supabase.from("fire_risks").upsert(
        {
          id: p.id,
          customer_id: p.customerId,
          site_id: p.siteId,
          job_id: p.jobId,
          technician_id: p.technicianId,
          location_description: p.locationDescription,
          risk_type: p.riskType,
          severity: p.severity,
          description: p.description,
          recommended_action: p.recommendedAction,
          status: "open",
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
      throwIfError(error, "Fire risk");
      break;
    }

    case "photo": {
      const p = op.payload;
      const { error: uploadError } = await supabase.storage
        .from("job-photos")
        .upload(p.storagePath, p.blob, {
          contentType: p.contentType,
          upsert: true,
        });
      throwIfError(uploadError, "Photo upload");

      const { error } = await supabase.from("photos").upsert(
        {
          id: p.id,
          job_id: p.jobId,
          asset_id: p.assetId,
          defect_id: p.defectId,
          inspection_id: p.inspectionId,
          technician_id: p.technicianId,
          storage_path: p.storagePath,
          stage: p.stage,
          latitude: p.latitude,
          longitude: p.longitude,
          taken_at: p.takenAt,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
      throwIfError(error, "Photo record");
      break;
    }

    case "signature_complete": {
      const p = op.payload;
      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(p.storagePath, p.blob, {
          contentType: "image/png",
          upsert: true,
        });
      throwIfError(uploadError, "Signature upload");

      const { error } = await supabase.from("signatures").upsert(
        {
          job_id: p.jobId,
          signer_name: p.signerName,
          signer_title: p.signerTitle,
          storage_path: p.storagePath,
          latitude: p.latitude,
          longitude: p.longitude,
          signed_at: p.signedAt,
        },
        { onConflict: "job_id", ignoreDuplicates: true }
      );
      throwIfError(error, "Signature record");

      const { error: jobError } = await supabase
        .from("jobs")
        .update({ status: "completed", completed_at: p.completedAt })
        .eq("id", p.jobId);
      throwIfError(jobError, "Job completion");
      break;
    }

    case "stock_usage": {
      const p = op.payload;
      for (const item of p.items) {
        const { error } = await supabase.from("stock_usage").insert({
          job_id: p.jobId,
          technician_id: p.technicianId,
          stock_item_id: item.stockItemId,
          quantity: item.quantity,
        });
        throwIfError(error, "Stock usage");
      }
      break;
    }

    case "checklist_draft": {
      const p = op.payload;
      const now = new Date().toISOString();
      const checklistId = await saveChecklistHeader(
        supabase,
        p,
        {
          asset_type: p.assetType,
          status: "in_progress",
          started_at: now,
          completed_by: p.technicianId,
          overall_result: p.overallResult ?? null,
          notes: p.notes ?? null,
          final_condition_confirmed: p.finalConditionConfirmed ?? false,
          customer_informed: p.customerInformed ?? false,
          completed_at: null,
          inspection_id: null,
        },
        "Checklist draft"
      );
      await persistChecklistAnswers(supabase, checklistId, p.answers);
      await supabase.from("inspection_checklist_audit").insert({
        checklist_id: checklistId,
        actor_id: p.technicianId,
        action: "draft_saved",
        details: { answer_count: p.answers.length },
      });
      break;
    }

    case "checklist_complete": {
      const p = op.payload;
      const now = new Date().toISOString();
      const hasFailures = p.answers.some((a) => a.result === "fail");
      const checklistStatus =
        p.overallResult === "unable_to_test"
          ? "unable_to_complete"
          : hasFailures
            ? "complete_with_defects"
            : "complete";

      const { error: inspError } = await supabase.from("inspections").upsert(
        {
          id: p.inspectionId,
          job_id: p.jobId,
          asset_id: p.assetId,
          technician_id: p.technicianId,
          asset_type: p.assetType,
          checklist: p.legacyChecklist,
          result: p.inspectionResult,
          requires_refill: p.requiresRefill,
          requires_pressure_test: p.requiresPressureTest,
          notes: p.notes,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
      throwIfError(inspError, "Inspection");

      const checklistId = await saveChecklistHeader(
        supabase,
        p,
        {
          asset_type: p.assetType,
          status: "in_progress",
          started_at: now,
          completed_by: p.technicianId,
          overall_result: p.overallResult,
          notes: p.notes ?? null,
          final_condition_confirmed: p.finalConditionConfirmed,
          customer_informed: p.customerInformed,
          completed_at: null,
          inspection_id: null,
        },
        "Checklist prepare"
      );

      await persistChecklistAnswers(supabase, checklistId, p.answers);

      const { error: headerError } = await supabase
        .from("inspection_checklists")
        .update({
          inspection_id: p.inspectionId,
          status: checklistStatus,
          completed_at: now,
          overall_result: p.overallResult,
          notes: p.notes ?? null,
          final_condition_confirmed: p.finalConditionConfirmed,
          customer_informed: p.customerInformed,
        })
        .eq("id", checklistId);
      throwIfError(headerError, "Checklist complete");

      for (const defect of p.defects) {
        const { error } = await supabase.from("defects").upsert(
          {
            id: defect.id,
            job_id: p.jobId,
            asset_id: p.assetId,
            technician_id: p.technicianId,
            defect_type: defect.defectType,
            severity: defect.severity,
            description: defect.description,
            recommended_action: defect.recommendedAction,
            quote_required: defect.quoteRequired,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );
        throwIfError(error, "Checklist defect");
      }

      const { data: existingInspections } = await supabase
        .from("inspections")
        .select(
          "id, created_at, result, notes, requires_refill, requires_pressure_test, job_id, job:jobs(id, job_number, status, scheduled_date, completed_at)"
        )
        .eq("asset_id", p.assetId);

      const latest = pickLatestInspection([
        ...((existingInspections ?? []) as Array<{
          id: string;
          created_at: string;
          result: "pass" | "fail";
          notes: string | null;
          requires_refill: boolean;
          requires_pressure_test: boolean;
          job_id: string;
          job?: {
            id?: string;
            job_number?: string | null;
            status?: string | null;
            scheduled_date?: string | null;
            completed_at?: string | null;
          } | null;
        }>),
        {
          id: p.inspectionId,
          created_at: now,
          result: p.inspectionResult,
          notes: p.notes ?? null,
          requires_refill: p.requiresRefill,
          requires_pressure_test: p.requiresPressureTest,
          job_id: p.jobId,
          job: { scheduled_date: p.serviceDate },
        },
      ]);

      if (latest?.id === p.inspectionId) {
        const { data: assetRow } = await supabase
          .from("assets")
          .select("*")
          .eq("id", p.assetId)
          .single();

        const { data: openDefects } = await supabase
          .from("defects")
          .select("status, severity, description, defect_type, recommended_action")
          .eq("asset_id", p.assetId)
          .eq("status", "open");

        if (assetRow) {
          const update = buildAssetUpdateFromLatestInspection(
            assetRow,
            {
              id: p.inspectionId,
              created_at: now,
              result: p.inspectionResult,
              notes: p.notes ?? null,
              requires_refill: p.requiresRefill,
              requires_pressure_test: p.requiresPressureTest,
              job_id: p.jobId,
              job: { scheduled_date: p.serviceDate },
            },
            openDefects ?? []
          );
          await supabase.from("assets").update(update).eq("id", p.assetId);
        }
      }

      await supabase.from("asset_events").insert({
        asset_id: p.assetId,
        job_id: p.jobId,
        technician_id: p.technicianId,
        event_type: p.inspectionResult === "pass" ? "serviced" : "inspected",
        details: {
          result: p.inspectionResult,
          inspection_id: p.inspectionId,
          checklist_id: checklistId,
          checklist_version: CHECKLIST_VERSION,
        },
      });

      await supabase.from("inspection_checklist_audit").insert({
        checklist_id: checklistId,
        actor_id: p.technicianId,
        action: "completed",
        details: {
          overall_result: p.overallResult,
          status: checklistStatus,
          defect_count: p.defects.length,
        },
      });
      break;
    }
  }
}

/** Reads the signed-in user id from the local session (works offline). */
export async function getLocalUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

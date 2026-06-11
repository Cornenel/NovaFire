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

      await supabase
        .from("assets")
        .update({
          last_service_date: p.serviceDate,
          next_service_date: p.nextServiceDate,
          status: p.result === "pass" ? "compliant" : "defective",
        })
        .eq("id", p.assetId);

      await supabase.from("asset_events").insert({
        asset_id: p.assetId,
        job_id: p.jobId,
        technician_id: p.technicianId,
        event_type: "inspected",
        details: { result: p.result, requires_refill: p.requiresRefill },
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

import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  JobReportDocument,
  type JobReportData,
} from "@/lib/reports/job-report";

/** GET /api/reports/[jobId] – generates the service report PDF (staff only). */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();
  if (
    !profile?.is_active ||
    !["technician", "dispatcher", "admin"].includes(profile.role)
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  // Job + relations (RLS still applies for technicians)
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "*, customer:customers(name, contact_person, email), site:sites(name, address), technician:profiles!jobs_assigned_to_fkey(full_name)"
    )
    .eq("id", jobId)
    .single();
  if (!job) return new Response("Not found", { status: 404 });

  const [
    { data: inspections },
    { data: defects },
    { data: stockUsed },
    { count: photoCount },
    { data: signature },
  ] = await Promise.all([
    supabase
      .from("inspections")
      .select(
        "result, checklist, requires_refill, requires_pressure_test, notes, asset:assets(asset_code, asset_type)"
      )
      .eq("job_id", jobId)
      .order("created_at"),
    supabase
      .from("defects")
      .select(
        "defect_type, severity, description, recommended_action, quote_required, asset:assets(asset_code)"
      )
      .eq("job_id", jobId),
    supabase
      .from("stock_usage")
      .select("quantity, stock_item:stock_items(name)")
      .eq("job_id", jobId),
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId),
    supabase
      .from("signatures")
      .select("signer_name, signer_title, signed_at, latitude, longitude, storage_path")
      .eq("job_id", jobId)
      .maybeSingle(),
  ]);

  // Signature image as data URI
  let imageDataUri: string | null = null;
  if (signature?.storage_path) {
    const { data: file } = await supabase.storage
      .from("signatures")
      .download(signature.storage_path);
    if (file) {
      const buf = Buffer.from(await file.arrayBuffer());
      imageDataUri = `data:image/png;base64,${buf.toString("base64")}`;
    }
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data: JobReportData = {
    job,
    customer: (job as any).customer,
    site: (job as any).site,
    technicianName: (job as any).technician?.full_name ?? "Unassigned",
    inspections: ((inspections ?? []) as any[]).map((i) => ({
      assetCode: i.asset?.asset_code ?? "—",
      assetType: i.asset?.asset_type ?? "fire_extinguisher",
      result: i.result,
      checklist: i.checklist ?? {},
      requiresRefill: i.requires_refill,
      requiresPressureTest: i.requires_pressure_test,
      notes: i.notes,
    })),
    defects: ((defects ?? []) as any[]).map((d) => ({
      assetCode: d.asset?.asset_code ?? "—",
      defectType: d.defect_type,
      severity: d.severity,
      description: d.description,
      recommendedAction: d.recommended_action,
      quoteRequired: d.quote_required,
    })),
    stockUsed: ((stockUsed ?? []) as any[]).map((u) => ({
      name: u.stock_item?.name ?? "Item",
      quantity: u.quantity,
    })),
    photoCount: photoCount ?? 0,
    signature: signature
      ? {
          signerName: signature.signer_name,
          signerTitle: signature.signer_title,
          signedAt: signature.signed_at,
          latitude: signature.latitude,
          longitude: signature.longitude,
          imageDataUri,
        }
      : null,
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const buffer = await renderToBuffer(JobReportDocument({ data }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${job.job_number}-service-report.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

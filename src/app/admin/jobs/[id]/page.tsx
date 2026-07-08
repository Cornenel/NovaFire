import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, FileDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobAdminControls } from "@/components/admin/job-admin-controls";
import {
  DEFECT_SEVERITY_LABELS,
  DEFECT_SEVERITY_STYLES,
  JOB_PRIORITY_LABELS,
  JOB_PRIORITY_STYLES,
  JOB_STATUS_LABELS,
  JOB_STATUS_STYLES,
  JOB_TYPE_LABELS,
  importSourceLabel,
} from "@/lib/fsm/labels";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import { formatPartsUsedAndNotes } from "@/lib/reports/inspection-display";
import type {
  AssetType,
  DefectSeverity,
  DefectStatus,
  InspectionResult,
  JobWithRelations,
  PhotoStage,
} from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

interface InspectionRow {
  id: string;
  result: InspectionResult;
  requires_refill: boolean;
  requires_pressure_test: boolean;
  checklist: Record<string, boolean | string | string[]>;
  notes: string | null;
  created_at: string;
  asset: {
    asset_code: string;
    asset_type: AssetType;
    size_capacity: string | null;
    asset_medium?: string | null;
  } | null;
}

interface DefectRow {
  id: string;
  defect_type: string;
  severity: DefectSeverity;
  status: DefectStatus;
  description: string;
  quote_required: boolean;
  quote_group_id: string | null;
  asset: { asset_code: string } | null;
}

interface PhotoRow {
  id: string;
  storage_path: string;
  stage: PhotoStage;
}

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("jobs")
    .select("*, customer:customers(*), site:sites(*)")
    .eq("id", id)
    .single();
  if (!data) notFound();
  const job = data as JobWithRelations;

  const [
    { data: technicians },
    { data: inspectionsData },
    { data: defectsData },
    { data: photosData },
    { data: signature },
    { data: stockUsed },
    { data: quoteGroupsData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["technician", "dispatcher", "admin"])
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("inspections")
      .select(
        "id, result, requires_refill, requires_pressure_test, checklist, notes, created_at, asset:assets(asset_code, asset_type, size_capacity, asset_medium)"
      )
      .eq("job_id", id)
      .order("created_at"),
    supabase
      .from("defects")
      .select(
        "id, defect_type, severity, status, description, quote_required, quote_group_id, asset:assets(asset_code)"
      )
      .eq("job_id", id),
    supabase
      .from("photos")
      .select("id, storage_path, stage")
      .eq("job_id", id)
      .order("taken_at"),
    supabase
      .from("signatures")
      .select("signer_name, signer_title, signed_at, storage_path")
      .eq("job_id", id)
      .maybeSingle(),
    supabase
      .from("stock_usage")
      .select("quantity, stock_item:stock_items(name)")
      .eq("job_id", id),
    supabase
      .from("quote_groups")
      .select("id, quote_type, status, reason, total_assets")
      .eq("job_id", id),
  ]);

  const inspections = (inspectionsData ?? []) as unknown as InspectionRow[];
  const defects = (defectsData ?? []) as unknown as DefectRow[];
  const photos = (photosData ?? []) as PhotoRow[];
  const stock = (stockUsed ?? []) as unknown as Array<{
    quantity: number;
    stock_item: { name: string } | null;
  }>;
  const quoteGroups = (quoteGroupsData ?? []) as Array<{
    id: string;
    quote_type: string;
    status: string;
    reason: string | null;
    total_assets: number;
  }>;
  const pressureTestCount = inspections.filter((i) => i.requires_pressure_test).length;
  const isZohoAnnualService =
    job.import_source === "zoho_import" && job.job_type === "annual_service";
  const importSource = importSourceLabel(job.import_source);

  // Signed URLs for photos and signature
  let photoUrls: Record<string, string> = {};
  if (photos.length > 0) {
    const { data: signed } = await supabase.storage
      .from("job-photos")
      .createSignedUrls(photos.map((p) => p.storage_path), 3600);
    photoUrls = Object.fromEntries(
      (signed ?? [])
        .filter((s): s is typeof s & { path: string; signedUrl: string } =>
          Boolean(s.path && s.signedUrl)
        )
        .map((s) => [s.path, s.signedUrl])
    );
  }

  let signatureUrl: string | null = null;
  if (signature) {
    const { data: signedSig } = await supabase.storage
      .from("signatures")
      .createSignedUrl(signature.storage_path, 3600);
    signatureUrl = signedSig?.signedUrl ?? null;
  }

  return (
    <div>
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Jobs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-mono text-zinc-500">{job.job_number}</p>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
            {job.customer.name} · {job.site.name}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white/[0.04] text-zinc-300 border-white/10">
              {JOB_TYPE_LABELS[job.job_type]}
            </span>
            <span
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full border",
                JOB_PRIORITY_STYLES[job.priority]
              )}
            >
              {JOB_PRIORITY_LABELS[job.priority]}
            </span>
            <span
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full border",
                JOB_STATUS_STYLES[job.status]
              )}
            >
              {JOB_STATUS_LABELS[job.status]}
            </span>
            {job.service_category ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white/[0.04] text-zinc-400 border-white/10">
                {job.service_category}
              </span>
            ) : null}
            {importSource ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white/[0.04] text-zinc-400 border-white/10">
                {importSource}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <JobAdminControls
            jobId={job.id}
            assignedTo={job.assigned_to}
            technicians={technicians ?? []}
            canCancel={!["completed", "cancelled"].includes(job.status)}
          />
          <a
            href={`/api/reports/${job.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 text-sm hover:bg-white/[0.07] transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Service Report (PDF)
          </a>
        </div>
      </div>

      {isZohoAnnualService && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
          <p className="text-sm text-amber-200">
            Annual Service completed.
            {pressureTestCount > 0
              ? ` Pressure testing required for ${pressureTestCount} device${pressureTestCount === 1 ? "" : "s"}.`
              : ""}
            {quoteGroups.length > 0
              ? ` ${quoteGroups.length} quote required.`
              : pressureTestCount > 0
                ? ""
                : " No additional quotes required."}
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: timeline + details */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-500">Scheduled</p>
              <p className="text-sm text-zinc-200">{job.scheduled_date}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-500">Travel started</p>
              <p className="text-sm text-zinc-200">{fmt(job.travel_started_at)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-500">Checked in</p>
              <p className="text-sm text-zinc-200">
                {fmt(job.checked_in_at)}
                {job.checkin_latitude && job.checkin_longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${job.checkin_latitude},${job.checkin_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-400 ml-2 text-xs"
                  >
                    <MapPin className="w-3 h-3" />
                    GPS
                  </a>
                )}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-500">Completed</p>
              <p className="text-sm text-zinc-200">{fmt(job.completed_at)}</p>
            </div>
          </div>

          {job.description && (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3">
              <p className="text-xs text-zinc-500 mb-1">Instructions</p>
              <p className="text-sm text-zinc-300">{job.description}</p>
            </div>
          )}

          {/* Signature */}
          {signature && (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3">
              <p className="text-xs text-zinc-500 mb-2">Customer sign-off</p>
              {signatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signatureUrl}
                  alt="Customer signature"
                  className="w-full max-w-[260px] rounded-lg bg-white/[0.03] border border-white/10 mb-2"
                />
              )}
              <p className="text-sm text-zinc-200">
                {signature.signer_name}
                {signature.signer_title && (
                  <span className="text-zinc-500"> · {signature.signer_title}</span>
                )}
              </p>
              <p className="text-xs text-zinc-500">{fmt(signature.signed_at)}</p>
            </div>
          )}

          {/* Stock used */}
          {stock.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3">
              <p className="text-xs text-zinc-500 mb-2">Stock used</p>
              <ul className="space-y-1">
                {stock.map((s, i) => (
                  <li key={i} className="text-sm text-zinc-300">
                    {s.quantity}× {s.stock_item?.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Middle: inspections + defects */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              {isZohoAnnualService ? "Annual service records" : "Inspections"} (
              {inspections.length})
            </h2>
            {inspections.length === 0 ? (
              <p className="text-zinc-500 text-sm">No inspections recorded.</p>
            ) : (
              <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
                {inspections.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200">
                        <span className="font-mono text-xs text-zinc-500 mr-2">
                          {i.asset?.asset_code}
                        </span>
                        {i.asset ? formatAssetDisplayName(i.asset) : "Asset"}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {fmt(i.created_at)}
                        {" · "}
                        {formatPartsUsedAndNotes({
                          checklist: i.checklist ?? {},
                          requiresRefill: i.requires_refill,
                          requiresPressureTest: i.requires_pressure_test,
                          notes: i.notes,
                        })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border shrink-0",
                        i.result === "pass"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/15 text-red-400 border-red-500/40"
                      )}
                    >
                      {i.result.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Defects ({defects.length})
            </h2>
            {defects.length === 0 ? (
              <p className="text-zinc-500 text-sm">No defects recorded.</p>
            ) : (
              <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
                {defects.map((d) => (
                  <div key={d.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm text-white">
                        <span className="font-mono text-xs text-zinc-500 mr-2">
                          {d.asset?.asset_code}
                        </span>
                        {d.defect_type}
                        {d.quote_group_id ? (
                          <span className="text-amber-500/90 text-xs ml-2">
                            Included in quote group
                          </span>
                        ) : d.quote_required ? (
                          <span className="text-amber-500/90 text-xs ml-2">
                            Quote required
                          </span>
                        ) : null}
                      </p>
                      <span
                        className={cn(
                          "text-[11px] px-2 py-0.5 rounded-full border shrink-0",
                          DEFECT_SEVERITY_STYLES[d.severity]
                        )}
                      >
                        {DEFECT_SEVERITY_LABELS[d.severity]}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{d.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photos */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Photos ({photos.length})
            </h2>
            {photos.length === 0 ? (
              <p className="text-zinc-500 text-sm">No photos uploaded.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {photos.map((p) => {
                  const url = photoUrls[p.storage_path];
                  if (!url) return null;
                  return (
                    <a
                      key={p.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square rounded-lg overflow-hidden border border-white/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`${p.stage} photo`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-zinc-300 uppercase">
                        {p.stage}
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MapPin,
  KeyRound,
  FlameKindling,
  ChevronRight,
  CheckCircle2,
  FileDown,
  Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobWorkflow } from "@/components/tech/job-workflow";
import { featureFlags } from "@/lib/fsm/feature-flags";
import {
  ASSET_STATUS_STYLES,
  ASSET_STATUS_LABELS,
  JOB_PRIORITY_LABELS,
  JOB_PRIORITY_STYLES,
  JOB_STATUS_LABELS,
  JOB_STATUS_STYLES,
  JOB_TYPE_LABELS,
  resolveJobTypeLabel,
} from "@/lib/fsm/labels";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import type { Asset, JobWithRelations } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

export default async function JobDetailPage({
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

  const { data: assetsData } = await supabase
    .from("assets")
    .select("*")
    .eq("site_id", job.site_id)
    .order("asset_code");
  const assets = (assetsData ?? []) as Asset[];

  const { data: inspections } = await supabase
    .from("inspections")
    .select("asset_id, result")
    .eq("job_id", job.id);
  const inspectedAssetIds = new Set(
    (inspections ?? []).map((i) => i.asset_id as string)
  );

  const mapsQuery =
    job.site.latitude && job.site.longitude
      ? `${job.site.latitude},${job.site.longitude}`
      : job.site.address;

  const fmtTime = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString("en-ZA", {
          timeZone: "Africa/Johannesburg",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <div>
      <Link
        href="/tech"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Today&apos;s Jobs
      </Link>

      {/* Header */}
      <div className="mb-4">
        <p className="text-[11px] font-mono text-zinc-500">{job.job_number}</p>
        <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
          {job.customer.name}
        </h1>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white/[0.04] text-zinc-300 border-white/10">
            {resolveJobTypeLabel(job)}
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
        </div>
      </div>

      {/* Workflow actions */}
      <div className="mb-6">
        <JobWorkflow jobId={job.id} status={job.status} />
        {(job.travel_started_at || job.checked_in_at || job.completed_at) && (
          <div className="mt-3 rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3 space-y-1">
            {job.travel_started_at && (
              <p className="text-xs text-zinc-500">
                Travel started {fmtTime(job.travel_started_at)}
              </p>
            )}
            {job.checked_in_at && (
              <p className="text-xs text-zinc-500">
                Checked in {fmtTime(job.checked_in_at)}
                {job.checkin_latitude && job.checkin_longitude
                  ? ` · GPS ${job.checkin_latitude.toFixed(5)}, ${job.checkin_longitude.toFixed(5)}`
                  : " · no GPS"}
              </p>
            )}
            {job.completed_at && (
              <p className="text-xs text-emerald-400">
                Completed {fmtTime(job.completed_at)}
              </p>
            )}
          </div>
        )}
        {job.status === "completed" && (
          <a
            href={`/api/reports/${job.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-zinc-200 text-sm font-medium hover:bg-white/[0.07] transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Service Report (PDF)
          </a>
        )}
        {featureFlags.fireRiskRegister && job.status !== "cancelled" && (
          <Link
            href={`/tech/jobs/${job.id}/risk`}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-red-300 text-sm font-medium hover:bg-red-500/[0.08] transition-colors"
          >
            <Flame className="w-4 h-4" />
            Log Fire Risk
          </Link>
        )}
      </div>

      {/* Site details */}
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 mb-6 space-y-3">
        <h2 className="text-sm font-semibold text-white">{job.site.name}</h2>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 text-sm text-sky-400"
        >
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          {job.site.address}
        </a>
        {(job.contact_person || job.contact_phone) && (
          <a
            href={job.contact_phone ? `tel:${job.contact_phone.replace(/\s/g, "")}` : undefined}
            className="flex items-center gap-2 text-sm text-zinc-300"
          >
            <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
            {job.contact_person}
            {job.contact_phone && (
              <span className="text-zinc-500">· {job.contact_phone}</span>
            )}
          </a>
        )}
        {job.site.access_notes && (
          <p className="flex items-start gap-2 text-sm text-zinc-400">
            <KeyRound className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            {job.site.access_notes}
          </p>
        )}
        {job.description && (
          <p className="text-sm text-zinc-400 border-t border-white/5 pt-3">
            {job.description}
          </p>
        )}
      </div>

      {/* Asset register */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-300">
          Site Asset Register ({assets.length})
        </h2>
        <span className="text-[11px] text-zinc-600">
          {inspectedAssetIds.size}/{assets.length} inspected
        </span>
      </div>

      {assets.length === 0 ? (
        <p className="text-zinc-500 text-sm">No assets registered at this site.</p>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/tech/assets/${asset.id}?job=${job.id}`}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3 active:bg-white/[0.04] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <FlameKindling className="w-4.5 h-4.5 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">
                    <span className="font-mono text-xs text-zinc-500 mr-2">
                      {asset.asset_code}
                    </span>
                    <span className="text-zinc-600 mr-2">|</span>
                    {formatAssetDisplayName(asset)}
                  </p>
                  {inspectedAssetIds.has(asset.id) && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate">
                  {asset.location_description ?? "No location"}
                </p>
              </div>
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border shrink-0",
                  ASSET_STATUS_STYLES[asset.status]
                )}
              >
                {ASSET_STATUS_LABELS[asset.status]}
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  History,
  AlertTriangle,
  ClipboardCheck,
  Camera,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AssetStatusActions } from "@/components/tech/asset-status-actions";
import { AssetInsights } from "@/components/tech/asset-insights";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { computeAssetInsights } from "@/lib/fsm/insights";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_STYLES,
  DEFECT_SEVERITY_LABELS,
  DEFECT_SEVERITY_STYLES,
} from "@/lib/fsm/labels";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import type { Asset, AssetEvent, Defect, Inspection } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
  installed: "Installed",
  inspected: "Inspected",
  defect_reported: "Defect reported",
  refilled: "Refilled",
  replaced: "Replaced",
  removed: "Removed",
  marked_missing: "Marked missing",
  status_changed: "Status changed",
  serviced: "Serviced",
};

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ job?: string }>;
}) {
  const { id } = await params;
  const { job: jobIdParam } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("assets")
    .select("*, site:sites(name, address)")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const asset = data as Asset & { site: { name: string; address: string } };

  // Job context: explicit ?job= param, otherwise the technician's open job
  // at this site (covers arriving here via QR scan).
  let jobId = jobIdParam ?? null;
  if (!jobId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: openJob } = await supabase
      .from("jobs")
      .select("id")
      .eq("assigned_to", user!.id)
      .eq("site_id", asset.site_id)
      .in("status", ["not_started", "travelling", "on_site", "awaiting_parts"])
      .order("scheduled_date")
      .limit(1)
      .maybeSingle();
    jobId = openJob?.id ?? null;
  }

  const [
    { data: events },
    { data: defects },
    { data: inspections },
    { count: totalDefects },
  ] = await Promise.all([
    supabase
      .from("asset_events")
      .select("*")
      .eq("asset_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("defects")
      .select("*")
      .eq("asset_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("inspections")
      .select("*")
      .eq("asset_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    // Phase 5 (F1): exact defect count for the insights panel (read-only)
    supabase
      .from("defects")
      .select("id", { count: "exact", head: true })
      .eq("asset_id", id),
  ]);

  // Phase 5 (F1): Smart Asset Insights – computed from data already loaded
  const insights = featureFlags.assetInsights
    ? computeAssetInsights(
        asset,
        (events ?? []) as AssetEvent[],
        (inspections ?? []) as Inspection[],
        totalDefects ?? 0
      )
    : null;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const details: Array<[string, string | null]> = [
    ["Asset ID", asset.asset_code],
    ["Type", formatAssetDisplayName(asset)],
    ["Medium", asset.asset_medium ?? null],
    ["Size / capacity", asset.size_capacity],
    ["Serial number", asset.serial_number],
    ["Location", asset.location_description],
    [
      "Last service",
      asset.last_service_date ? fmtDate(asset.last_service_date) : null,
    ],
    [
      "Next service",
      asset.next_service_date ? fmtDate(asset.next_service_date) : null,
    ],
  ];

  return (
    <div>
      <Link
        href={jobId ? `/tech/jobs/${jobId}` : "/tech"}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {jobId ? "Back to job" : "Back"}
      </Link>

      {/* Header */}
      <div className="mb-4">
        <p className="text-[11px] font-mono text-zinc-500">{asset.asset_code}</p>
        <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
          {formatAssetDisplayName(asset)}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={cn(
              "text-[11px] px-2 py-0.5 rounded-full border",
              ASSET_STATUS_STYLES[asset.status]
            )}
          >
            {ASSET_STATUS_LABELS[asset.status]}
          </span>
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="w-3 h-3" />
            {asset.site.name}
          </span>
        </div>
      </div>

      {/* Phase 5 (F1): read-only insights – collapsible, flag-gated */}
      {insights && <AssetInsights data={insights} />}

      {/* Details */}
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5 mb-6">
        {details
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
              <span className="text-sm text-zinc-500">{label}</span>
              <span className="text-sm text-zinc-200 text-right">{value}</span>
            </div>
          ))}
      </div>

      {/* Actions */}
      <div className="mb-6 space-y-3">
        {jobId ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/tech/assets/${asset.id}/inspect?job=${jobId}`}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
              >
                <ClipboardCheck className="w-4 h-4" />
                Inspect
              </Link>
              <Link
                href={`/tech/assets/${asset.id}/defect?job=${jobId}`}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-semibold transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Defect
              </Link>
            </div>
            <Link
              href={`/tech/assets/${asset.id}/photos?job=${jobId}`}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm font-medium transition-colors"
            >
              <Camera className="w-4 h-4" />
              Photos
            </Link>
          </>
        ) : (
          <p className="text-xs text-zinc-600 rounded-xl border border-white/[0.06] px-4 py-3">
            No open job at this site – inspections, defects and photos are
            recorded against a job.
          </p>
        )}
        <AssetStatusActions assetId={asset.id} jobId={jobId} />
      </div>

      {/* Open defects */}
      {(defects ?? []).filter((d) => d.status === "open").length > 0 && (
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Open Defects
          </h2>
          <div className="space-y-2">
            {(defects as Defect[])
              .filter((d) => d.status === "open")
              .map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-white">
                      {d.defect_type}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border",
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
        </div>
      )}

      {/* History */}
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
        <History className="w-4 h-4" />
        Service History
      </h2>

      {(events ?? []).length === 0 && (inspections ?? []).length === 0 ? (
        <p className="text-zinc-500 text-sm">
          No recorded history for this asset yet.
        </p>
      ) : (
        <div className="space-y-2">
          {(inspections as Inspection[] | null)?.map((i) => (
            <div
              key={i.id}
              className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-zinc-200">Inspection</p>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border",
                    i.result === "pass"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/15 text-red-400 border-red-500/40"
                  )}
                >
                  {i.result.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {fmtDate(i.created_at)}
                {i.notes ? ` · ${i.notes}` : ""}
              </p>
            </div>
          ))}
          {(events as AssetEvent[] | null)?.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3"
            >
              <p className="text-sm text-zinc-200">
                {EVENT_LABELS[e.event_type] ?? e.event_type}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{fmtDate(e.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

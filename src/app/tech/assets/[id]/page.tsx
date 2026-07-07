import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  AlertTriangle,
  ClipboardCheck,
  Camera,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AssetStatusActions } from "@/components/tech/asset-status-actions";
import { AssetInsights } from "@/components/tech/asset-insights";
import { AssetComplianceBadge } from "@/components/admin/asset-compliance-badge";
import { evaluateExistingAssetCompliance } from "@/lib/compliance/recheck";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { computeAssetInsights } from "@/lib/fsm/insights";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_STYLES,
  DEFECT_SEVERITY_LABELS,
  DEFECT_SEVERITY_STYLES,
} from "@/lib/fsm/labels";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import type { Asset, Defect, Inspection } from "@/lib/fsm/types";
import { AssetTimeline } from "@/components/fsm/asset-timeline";
import { loadAssetTimelineData } from "@/lib/fsm/load-asset-timeline";
import { cn } from "@/lib/utils";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const timelineBundle = await loadAssetTimelineData(supabase, id);
  if (!timelineBundle) notFound();
  const { timeline, inspections, defects } = timelineBundle;

  const { count: totalDefects } = await supabase
    .from("defects")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", id);

  if (!asset.calculated_compliance_status) {
    try {
      const latestInspection = (inspections ?? [])[0] as unknown as
        | (Inspection & { job?: Record<string, unknown> | null })
        | undefined;
      const evaluation = evaluateExistingAssetCompliance({
        asset,
        latestInspection,
        unresolvedDefects: ((defects ?? []) as unknown as Defect[]).map((defect) => ({
          status: defect.status,
          severity: defect.severity,
          description: defect.description,
          defectType: defect.defect_type,
          recommendedAction: defect.recommended_action,
        })),
      });
      Object.assign(asset, evaluation.payload);
      if (evaluation.changed) {
        const admin = createAdminClient();
        await admin.from("assets").update(evaluation.payload).eq("id", asset.id);
        await admin.from("asset_compliance_recheck_history").insert({
          ...evaluation.history,
          created_by: user?.id ?? null,
        });
      }
    } catch {
      // Lazy recalculation must never block QR access or technician workflow.
    }
  }

  // Phase 5 (F1): Smart Asset Insights – computed from data already loaded
  const insights = featureFlags.assetInsights
    ? computeAssetInsights(
        asset,
        [],
        (inspections ?? []) as unknown as Inspection[],
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
    [
      "Annual service due",
      asset.annual_service_due_date ? fmtDate(asset.annual_service_due_date) : null,
    ],
    [
      "Last pressure test",
      asset.last_pressure_test_date ? fmtDate(asset.last_pressure_test_date) : null,
    ],
    [
      "Pressure test due",
      asset.pressure_test_due_date ? fmtDate(asset.pressure_test_due_date) : null,
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

      <div className="mb-6">
        <AssetComplianceBadge asset={asset} showDetails />
      </div>

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
            {(defects as unknown as Defect[])
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

      {/* Asset timeline */}
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-4">
        <AssetTimeline
          entries={timeline}
          assetCode={asset.asset_code}
          assetLabel={formatAssetDisplayName(asset)}
          customerAssetNumber={asset.customer_asset_number}
        />
      </div>
    </div>
  );
}

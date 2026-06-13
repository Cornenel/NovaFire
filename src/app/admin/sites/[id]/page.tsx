import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AssetQr } from "@/components/admin/asset-qr";
import { AssetCreateForm } from "@/components/admin/asset-create-form";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_STYLES,
} from "@/lib/fsm/labels";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import type { Asset } from "@/lib/fsm/types";
import { featureFlags } from "@/lib/fsm/feature-flags";
import {
  calculateComplianceScore,
  detectRevenueOpportunities,
} from "@/lib/fsm/compliance";
import { ComplianceScoreBadge } from "@/components/admin/compliance-score-badge";
import { cn } from "@/lib/utils";

export default async function AdminSiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("*, customer:customers(id, name)")
    .eq("id", id)
    .single();
  if (!site) notFound();

  const { data: assetsData } = await supabase
    .from("assets")
    .select("*")
    .eq("site_id", id)
    .order("asset_code");
  const assets = (assetsData ?? []) as Asset[];

  // Phase 5 (F5): read-only compliance score for this site
  let compliance = null;
  if (featureFlags.complianceScore && assets.length > 0) {
    const { count: openDefects } = await supabase
      .from("defects")
      .select("id, asset:assets!inner(site_id)", { count: "exact", head: true })
      .eq("status", "open")
      .eq("asset.site_id", id);
    compliance = calculateComplianceScore({
      assets,
      openDefects: openDefects ?? 0,
    });
  }

  // Phase 5 (F8): recommendation engine only – no customer communication
  const opportunities = featureFlags.revenueOpportunities
    ? detectRevenueOpportunities(assets)
    : [];

  return (
    <div>
      <Link
        href={`/admin/customers/${site.customer.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {site.customer.name}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
          {site.name}
        </h1>
        <p className="flex items-center gap-1.5 text-sm text-zinc-500 mt-1">
          <MapPin className="w-3.5 h-3.5" />
          {site.address}
        </p>
        {/* Phase 5 (F5): read-only score – existing reports untouched */}
        {compliance && (
          <div className="mt-3">
            <ComplianceScoreBadge result={compliance} size="lg" />
          </div>
        )}
      </div>

      {/* Phase 5 (F8): upsell recommendations – display only */}
      {opportunities.length > 0 && (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3">
          <p className="text-xs font-semibold text-emerald-300 mb-2">
            Revenue Opportunities
          </p>
          <ul className="space-y-1.5">
            {opportunities.map((o, i) => (
              <li key={i} className="text-sm text-zinc-300">
                <span className="text-zinc-500">{o.areaLabel}:</span>{" "}
                {o.recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Asset register */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Asset Register ({assets.length})
          </h2>
          {assets.length === 0 ? (
            <p className="text-zinc-500 text-sm">No assets registered yet.</p>
          ) : (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
              {assets.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-mono text-xs text-zinc-500 mr-2">
                        {a.asset_code}
                      </span>
                      {formatAssetDisplayName(a)}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {a.location_description ?? "No location"}
                      {a.serial_number ? ` · SN ${a.serial_number}` : ""}
                      {a.next_service_date ? ` · next service ${a.next_service_date}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border",
                        ASSET_STATUS_STYLES[a.status]
                      )}
                    >
                      {ASSET_STATUS_LABELS[a.status]}
                    </span>
                    <AssetQr
                      qrToken={a.qr_token}
                      assetCode={a.asset_code}
                      label={formatAssetDisplayName(a)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add asset */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">New Asset</h2>
          <AssetCreateForm siteId={site.id} />
        </div>
      </div>
    </div>
  );
}

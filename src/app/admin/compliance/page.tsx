import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ShieldCheck,
  AlertTriangle,
  CalendarX,
  Package,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { featureFlags } from "@/lib/fsm/feature-flags";
import {
  calculateComplianceScore,
  detectRevenueOpportunities,
  type RevenueOpportunity,
} from "@/lib/fsm/compliance";
import { ComplianceScoreBadge } from "@/components/admin/compliance-score-badge";
import { todayInSA } from "@/lib/fsm/dates";
import type { Asset } from "@/lib/fsm/types";

export const metadata = { title: "Compliance | NovaFire Admin" };

/**
 * Phase 5 (F6): Compliance Dashboard – read-only visual overview.
 * Phase 5 (F8): Revenue opportunity detection across sites.
 * Dashboard only; no impact on operational workflows.
 */
export default async function ComplianceDashboardPage() {
  if (!featureFlags.complianceDashboard) notFound();

  const supabase = await createClient();
  const today = todayInSA();

  const [{ data: assetsData }, { data: defectsData }] = await Promise.all([
    supabase
      .from("assets")
      .select(
        "id, status, next_service_date, asset_type, location_description, size_capacity, asset_medium, site_id, site:sites(name, customer:customers(name))"
      ),
    supabase.from("defects").select("id, asset:assets(site_id)").eq("status", "open"),
  ]);

  type AssetRow = Pick<
    Asset,
    | "id"
    | "status"
    | "next_service_date"
    | "asset_type"
    | "location_description"
    | "size_capacity"
    | "asset_medium"
    | "site_id"
  > & { site: { name: string; customer: { name: string } | null } | null };

  const assets = (assetsData ?? []) as unknown as AssetRow[];
  const openDefects = (defectsData ?? []) as unknown as Array<{
    id: string;
    asset: { site_id: string } | null;
  }>;

  // Global figures
  const active = assets.filter((a) => a.status !== "removed");
  const totals = {
    total: active.length,
    compliant: active.filter((a) => a.status === "compliant").length,
    defective: active.filter((a) => a.status === "defective").length,
    expired: active.filter(
      (a) => a.next_service_date !== null && a.next_service_date < today
    ).length,
    openDefects: openDefects.length,
  };

  // Per-site grouping
  const defectsBySite = new Map<string, number>();
  for (const d of openDefects) {
    const siteId = d.asset?.site_id;
    if (siteId) defectsBySite.set(siteId, (defectsBySite.get(siteId) ?? 0) + 1);
  }

  const siteMap = new Map<string, { name: string; customer: string; assets: AssetRow[] }>();
  for (const a of assets) {
    if (!siteMap.has(a.site_id)) {
      siteMap.set(a.site_id, {
        name: a.site?.name ?? "Unknown site",
        customer: a.site?.customer?.name ?? "",
        assets: [],
      });
    }
    siteMap.get(a.site_id)!.assets.push(a);
  }

  const siteScores = [...siteMap.entries()]
    .map(([siteId, site]) => ({
      siteId,
      name: site.name,
      customer: site.customer,
      assetCount: site.assets.filter((a) => a.status !== "removed").length,
      result: calculateComplianceScore({
        assets: site.assets,
        openDefects: defectsBySite.get(siteId) ?? 0,
      }),
      opportunities: featureFlags.revenueOpportunities
        ? detectRevenueOpportunities(site.assets)
        : ([] as RevenueOpportunity[]),
    }))
    .sort((a, b) => a.result.score - b.result.score);

  const allOpportunities = siteScores.flatMap((s) =>
    s.opportunities.map((o) => ({ ...o, siteName: s.name, siteId: s.siteId }))
  );

  const stats = [
    { label: "Total assets", value: totals.total, icon: Package, color: "text-zinc-300" },
    { label: "Compliant", value: totals.compliant, icon: ShieldCheck, color: "text-emerald-400" },
    { label: "Defective", value: totals.defective, icon: AlertTriangle, color: "text-red-400" },
    { label: "Expired service", value: totals.expired, icon: CalendarX, color: "text-amber-400" },
    { label: "Open defects", value: totals.openDefects, icon: AlertTriangle, color: "text-amber-400" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-1">
        Compliance Dashboard
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Read-only overview – calculated live from the asset register.
      </p>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3"
          >
            <s.icon className={`w-4 h-4 mb-2 ${s.color}`} />
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Per-site scores */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Site Compliance Scores
          </h2>
          {siteScores.length === 0 ? (
            <p className="text-zinc-500 text-sm">No assets registered yet.</p>
          ) : (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
              {siteScores.map((s) => (
                <Link
                  key={s.siteId}
                  href={`/admin/sites/${s.siteId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{s.name}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {s.customer}
                      {s.customer ? " · " : ""}
                      {s.assetCount} asset{s.assetCount !== 1 ? "s" : ""}
                      {s.result.openDefects > 0
                        ? ` · ${s.result.openDefects} open defect${s.result.openDefects > 1 ? "s" : ""}`
                        : ""}
                    </p>
                  </div>
                  <ComplianceScoreBadge result={s.result} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Phase 5 (F8): revenue opportunities */}
        {featureFlags.revenueOpportunities && (
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Revenue Opportunities
            </h2>
            {allOpportunities.length === 0 ? (
              <p className="text-zinc-500 text-sm">
                No upsell opportunities detected.
              </p>
            ) : (
              <div className="space-y-2">
                {allOpportunities.map((o, i) => (
                  <Link
                    key={i}
                    href={`/admin/sites/${o.siteId}`}
                    className="block rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 hover:bg-emerald-500/[0.08] transition-colors"
                  >
                    <p className="text-xs text-zinc-500 mb-0.5">
                      {o.siteName} · {o.areaLabel}
                    </p>
                    <p className="text-sm text-zinc-200">{o.recommendation}</p>
                    <p className="text-[11px] text-emerald-400/80 mt-1">
                      Suggested item: {o.quoteItem}
                    </p>
                  </Link>
                ))}
              </div>
            )}
            <p className="text-[10px] text-zinc-600 mt-3">
              Recommendation engine only – no automatic customer communication.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

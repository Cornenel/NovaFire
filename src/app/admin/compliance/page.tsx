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
import { fireComplianceConfig } from "@/lib/compliance/fireCompliance";
import {
  calculateComplianceScore,
  detectRevenueOpportunities,
  type RevenueOpportunity,
} from "@/lib/fsm/compliance";
import { ComplianceScoreBadge } from "@/components/admin/compliance-score-badge";
import { ComplianceRecheckButton } from "@/components/admin/compliance-recheck-button";
import { todayInSA } from "@/lib/fsm/dates";
import type { Asset } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Compliance | NovaFire Admin" };

/**
 * Phase 5 (F6): Compliance Dashboard – read-only visual overview.
 * Phase 5 (F8): Revenue opportunity detection across sites.
 * Dashboard only; no impact on operational workflows.
 */
export default async function ComplianceDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  if (!featureFlags.complianceDashboard) notFound();

  const { filter = "all" } = await searchParams;
  const supabase = await createClient();
  const today = todayInSA();

  const [{ data: assetsData }, { data: defectsData }] = await Promise.all([
    supabase
      .from("assets")
      .select(
        "id, asset_code, status, next_service_date, annual_service_due_date, pressure_test_due_date, calculated_compliance_status, compliance_reasons, asset_type, location_description, size_capacity, asset_medium, site_id, site:sites(name, customer:customers(name))"
      ),
    supabase.from("defects").select("id, asset:assets(site_id)").eq("status", "open"),
  ]);

  type AssetRow = Pick<
    Asset,
    | "id"
    | "asset_code"
    | "status"
    | "next_service_date"
    | "annual_service_due_date"
    | "pressure_test_due_date"
    | "calculated_compliance_status"
    | "compliance_reasons"
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
  const warningCutoff = addDays(today, fireComplianceConfig.warningDays);

  // Global figures
  const active = assets.filter((a) => a.status !== "removed");
  const totals = {
    total: active.length,
    compliant: active.filter((a) => a.calculated_compliance_status === "COMPLIANT" || (!a.calculated_compliance_status && a.status === "compliant")).length,
    defective: active.filter((a) => a.calculated_compliance_status === "NON_COMPLIANT" || (!a.calculated_compliance_status && a.status === "defective")).length,
    expired: active.filter(
      (a) =>
        (a.annual_service_due_date ?? a.next_service_date) !== null &&
        (a.annual_service_due_date ?? a.next_service_date)! < today
    ).length,
    pressureDue: active.filter((a) => {
      const dueDate = a.pressure_test_due_date;
      return Boolean(dueDate && dueDate <= today);
    }).length,
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
  const filteredAssets = active.filter((asset) =>
    matchesFilter(asset, filter, today, warningCutoff)
  );

  const stats = [
    { label: "Total assets", value: totals.total, icon: Package, color: "text-zinc-300" },
    { label: "Compliant", value: totals.compliant, icon: ShieldCheck, color: "text-emerald-400" },
    { label: "Defective", value: totals.defective, icon: AlertTriangle, color: "text-red-400" },
    { label: "Expired service", value: totals.expired, icon: CalendarX, color: "text-amber-400" },
    { label: "Pressure tests due", value: totals.pressureDue, icon: CalendarX, color: "text-amber-400" },
    { label: "Open defects", value: totals.openDefects, icon: AlertTriangle, color: "text-amber-400" },
  ];
  const filters = [
    ["all", "All"],
    ["compliant", "Compliant"],
    ["non_compliant", "Non-compliant"],
    ["warning", "Warning"],
    ["unknown", "Unknown"],
    ["pressure_overdue", "Pressure test overdue"],
    ["pressure_due_soon", "Pressure test due soon"],
    ["annual_overdue", "Annual service overdue"],
    ["missing_data", "Missing required data"],
  ] as const;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-1">
        Compliance Dashboard
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Read-only overview – calculated live from the asset register.
      </p>

      <ComplianceRecheckButton />

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
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

      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(([value, label]) => (
          <Link
            key={value}
            href={value === "all" ? "/admin/compliance" : `/admin/compliance?filter=${value}`}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              filter === value
                ? "bg-red-600 text-white border-red-500"
                : "bg-white/[0.04] text-zinc-400 border-white/10 hover:text-white hover:bg-white/[0.08]"
            )}
          >
            {label}
          </Link>
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
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Filtered Equipment ({filteredAssets.length})
            </h2>
            {filteredAssets.length === 0 ? (
              <p className="text-zinc-500 text-sm">No equipment matches this filter.</p>
            ) : (
              <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
                {filteredAssets.slice(0, 15).map((asset) => (
                  <Link
                    key={asset.id}
                    href={`/admin/sites/${asset.site_id}`}
                    className="block px-4 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <p className="text-sm text-white truncate">
                      {asset.asset_code} · {asset.location_description ?? "No location"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {asset.site?.customer?.name ?? "Unknown customer"} ·{" "}
                      {asset.site?.name ?? "Unknown site"} ·{" "}
                      {asset.calculated_compliance_status ?? asset.status}
                    </p>
                  </Link>
                ))}
              </div>
            )}
            {filteredAssets.length > 15 && (
              <p className="text-[10px] text-zinc-600 mt-2">
                Showing first 15 matching records.
              </p>
            )}
          </div>

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
    </div>
  );
}

function matchesFilter(
  asset: Pick<
    Asset,
    | "status"
    | "calculated_compliance_status"
    | "pressure_test_due_date"
    | "annual_service_due_date"
    | "next_service_date"
    | "compliance_reasons"
  >,
  filter: string,
  today: string,
  warningCutoff: string
) {
  const status = asset.calculated_compliance_status ?? legacyStatus(asset.status);
  const pressureDue = asset.pressure_test_due_date;
  const annualDue = asset.annual_service_due_date ?? asset.next_service_date;
  if (filter === "all") return true;
  if (filter === "compliant") return status === "COMPLIANT";
  if (filter === "non_compliant") return status === "NON_COMPLIANT";
  if (filter === "warning") return status === "WARNING";
  if (filter === "unknown") return status === "UNKNOWN";
  if (filter === "pressure_overdue") return Boolean(pressureDue && pressureDue <= today);
  if (filter === "pressure_due_soon") {
    return Boolean(pressureDue && pressureDue > today && pressureDue <= warningCutoff);
  }
  if (filter === "annual_overdue") return Boolean(annualDue && annualDue <= today);
  if (filter === "missing_data") {
    return (asset.compliance_reasons ?? []).some((reason) =>
      reason.toLowerCase().includes("missing required identifying data")
    );
  }
  return true;
}

function legacyStatus(status: Asset["status"]) {
  if (status === "compliant" || status === "replaced") return "COMPLIANT";
  if (status === "defective" || status === "missing") return "NON_COMPLIANT";
  return "UNKNOWN";
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

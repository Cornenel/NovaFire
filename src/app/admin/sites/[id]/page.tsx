import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AssetQr } from "@/components/admin/asset-qr";
import { AssetCreateForm } from "@/components/admin/asset-create-form";
import { AssetComplianceBadge } from "@/components/admin/asset-compliance-badge";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ComplianceScoreBadge } from "@/components/admin/compliance-score-badge";
import {
  ilikePattern,
  parseAdminListParams,
} from "@/lib/admin/list-params";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import type { Asset } from "@/lib/fsm/types";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { detectRevenueOpportunities } from "@/lib/fsm/compliance";
import { loadSiteCompliance } from "@/lib/fsm/customer-compliance";

export default async function AdminSiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const { q, page, pageSize, from, to } = parseAdminListParams(raw);
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("*, customer:customers(id, name)")
    .eq("id", id)
    .single();
  if (!site) notFound();

  let assetsQuery = supabase
    .from("assets")
    .select("*", { count: "exact" })
    .eq("site_id", id)
    .order("asset_code")
    .range(from, to);

  if (q) {
    const pattern = ilikePattern(q);
    assetsQuery = assetsQuery.or(
      `asset_code.ilike.${pattern},customer_asset_number.ilike.${pattern},serial_number.ilike.${pattern},location_description.ilike.${pattern},asset_medium.ilike.${pattern},size_capacity.ilike.${pattern}`
    );
  }

  const [{ data: assetsData, count: assetsCount }, { data: allAssetsForOps }] =
    await Promise.all([
      assetsQuery,
      featureFlags.revenueOpportunities
        ? supabase
            .from("assets")
            .select(
              "id, asset_type, asset_medium, size_capacity, status, location_description, next_service_date, annual_service_due_date, pressure_test_due_date, hydro_test_due_date"
            )
            .eq("site_id", id)
        : Promise.resolve({ data: [] as Asset[] }),
    ]);

  const assets = (assetsData ?? []) as Asset[];
  const totalAssets = assetsCount ?? 0;

  let compliance = null;
  if (featureFlags.complianceScore) {
    compliance = await loadSiteCompliance(supabase, id, site.customer.id);
  }

  const opportunities = featureFlags.revenueOpportunities
    ? detectRevenueOpportunities((allAssetsForOps ?? []) as Asset[])
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
        {compliance && (
          <div className="mt-3">
            <ComplianceScoreBadge result={compliance} size="lg" />
          </div>
        )}
      </div>

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
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Asset Register ({totalAssets}
            {q ? " matching" : ""})
          </h2>
          <AdminListToolbar
            action={`/admin/sites/${id}`}
            q={q}
            placeholder="Search asset code, location, serial…"
          />
          {assets.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              {q
                ? "No assets match that search."
                : "No assets registered yet."}
            </p>
          ) : (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
              {assets.map((a) => (
                <Link
                  key={a.id}
                  href={`/admin/assets/${a.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-mono text-xs text-zinc-500 mr-2">
                        {a.asset_code}
                      </span>
                      <span className="text-zinc-600 mr-2">|</span>
                      {formatAssetDisplayName(a)}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {a.location_description ?? "No location"}
                      {a.serial_number ? ` · SN ${a.serial_number}` : ""}
                      {a.next_service_date
                        ? ` · next service ${a.next_service_date}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <AssetComplianceBadge asset={a} />
                    <AssetQr
                      qrToken={a.qr_token}
                      assetCode={a.asset_code}
                      label={formatAssetDisplayName(a)}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
          <AdminPagination
            pathname={`/admin/sites/${id}`}
            page={page}
            pageSize={pageSize}
            totalCount={totalAssets}
            params={{ q }}
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">New Asset</h2>
          <AssetCreateForm siteId={site.id} />
        </div>
      </div>
    </div>
  );
}

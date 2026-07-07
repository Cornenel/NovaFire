import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ComplianceScoreBadge } from "@/components/admin/compliance-score-badge";
import { AssetComplianceBadge } from "@/components/admin/asset-compliance-badge";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { calculateComplianceScore } from "@/lib/fsm/compliance";
import { requirePortalSession } from "@/lib/portal/session";
import { loadPortalAssets } from "@/lib/portal/queries";

export default async function PortalSiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requirePortalSession();
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id, name, address, contact_person, contact_phone")
    .eq("id", id)
    .single();

  if (!site) notFound();
  if (session.siteScopeId && session.siteScopeId !== site.id) notFound();

  const assets = await loadPortalAssets(supabase, session, site.id);
  const { count: openDefects } = await supabase
    .from("defects")
    .select("id, asset:assets!inner(site_id)", { count: "exact", head: true })
    .eq("status", "open")
    .eq("asset.site_id", site.id);

  const compliance =
    featureFlags.complianceScore && assets.length > 0
      ? calculateComplianceScore({ assets, openDefects: openDefects ?? 0 })
      : null;

  return (
    <div>
      <Link
        href="/client-portal/sites"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Sites
      </Link>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
        {site.name}
      </h1>
      <p className="text-sm text-zinc-500 mt-1">{site.address}</p>

      {compliance ? (
        <div className="mt-4">
          <ComplianceScoreBadge result={compliance} size="lg" />
        </div>
      ) : null}

      <h2 className="text-sm font-semibold text-zinc-300 mt-8 mb-3">
        Asset register ({assets.length})
      </h2>
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
        {assets.map((asset) => (
          <Link
            key={asset.id}
            href={`/client-portal/assets/${asset.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02]"
          >
            <div>
              <p className="text-sm text-white">
                <span className="font-mono text-xs text-zinc-500 mr-2">
                  {asset.asset_code}
                </span>
                {formatAssetDisplayName(asset)}
              </p>
              <p className="text-xs text-zinc-500">
                {asset.location_description ?? "No location"}
              </p>
            </div>
            <AssetComplianceBadge asset={asset} />
          </Link>
        ))}
      </div>
    </div>
  );
}

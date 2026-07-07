import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AssetComplianceBadge } from "@/components/admin/asset-compliance-badge";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import { requirePortalSession } from "@/lib/portal/session";
import { loadPortalAssets } from "@/lib/portal/queries";

export default async function PortalAssetsPage() {
  const session = await requirePortalSession();
  const supabase = await createClient();
  const assets = await loadPortalAssets(supabase, session);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-6">
        Asset register
      </h1>
      {assets.length === 0 ? (
        <p className="text-sm text-zinc-500">No assets available.</p>
      ) : (
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
                  {(asset.site as { name?: string } | null)?.name ?? "Site"} ·{" "}
                  {asset.location_description ?? "No location"}
                </p>
              </div>
              <AssetComplianceBadge asset={asset} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AssetTimeline } from "@/components/fsm/asset-timeline";
import { AssetComplianceBadge } from "@/components/admin/asset-compliance-badge";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import { loadAssetTimelineData } from "@/lib/fsm/load-asset-timeline";
import { requirePortalSession } from "@/lib/portal/session";

export default async function PortalAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePortalSession();
  const supabase = await createClient();

  const loaded = await loadAssetTimelineData(supabase, id);
  if (!loaded) notFound();

  const { asset, timeline } = loaded;

  return (
    <div>
      <Link
        href="/client-portal/assets"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Assets
      </Link>

      <div className="mb-6">
        <p className="text-[11px] font-mono text-zinc-500">{asset.asset_code}</p>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
          {formatAssetDisplayName(asset)}
        </h1>
        <div className="mt-3">
          <AssetComplianceBadge asset={asset} showDetails />
        </div>
      </div>

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

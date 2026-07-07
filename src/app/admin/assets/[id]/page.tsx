import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AssetTimeline } from "@/components/fsm/asset-timeline";
import { AssetComplianceBadge } from "@/components/admin/asset-compliance-badge";
import { AssetQr } from "@/components/admin/asset-qr";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import { loadAssetTimelineData } from "@/lib/fsm/load-asset-timeline";
import type { AssetStatus } from "@/lib/fsm/types";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_STYLES,
} from "@/lib/fsm/labels";
import { cn } from "@/lib/utils";

export const metadata = { title: "Asset History | NovaFire Admin" };

export default async function AdminAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const loaded = await loadAssetTimelineData(supabase, id);
  if (!loaded) notFound();

  const { asset, timeline } = loaded;
  const assetStatus = asset.status as AssetStatus;

  const { data: siteInfo } = await supabase
    .from("sites")
    .select("id, name, address, customer:customers(id, name)")
    .eq("id", asset.site_id)
    .single();

  if (!siteInfo) notFound();
  const customer = (siteInfo.customer as { id: string; name: string } | { id: string; name: string }[] | null);
  const customerName = Array.isArray(customer) ? customer[0]?.name : customer?.name;

  return (
    <div>
      <Link
        href={`/admin/sites/${siteInfo.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {customerName ?? "Customer"} · {siteInfo.name}
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-mono text-zinc-500">{asset.asset_code}</p>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
            {formatAssetDisplayName(asset)}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full border",
                ASSET_STATUS_STYLES[assetStatus]
              )}
            >
              {ASSET_STATUS_LABELS[assetStatus]}
            </span>
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="w-3 h-3" />
              {asset.location_description ?? siteInfo.address}
            </span>
          </div>
        </div>
        <AssetQr
          qrToken={asset.qr_token}
          assetCode={asset.asset_code}
          label={formatAssetDisplayName(asset)}
        />
      </div>

      <div className="mb-8">
        <AssetComplianceBadge asset={asset} showDetails />
      </div>

      <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-5">Asset Timeline</h2>
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

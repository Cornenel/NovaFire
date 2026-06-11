import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DefectForm } from "@/components/tech/defect-form";
import { ASSET_TYPE_LABELS } from "@/lib/fsm/labels";
import type { Asset } from "@/lib/fsm/types";

export default async function AssetDefectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ job?: string }>;
}) {
  const { id } = await params;
  const { job: jobId } = await searchParams;
  if (!jobId) redirect(`/tech/assets/${id}`);

  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) notFound();
  const asset = data as Asset;

  return (
    <div>
      <Link
        href={`/tech/assets/${id}?job=${jobId}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to asset
      </Link>

      <div className="mb-5">
        <p className="text-[11px] font-mono text-zinc-500">{asset.asset_code}</p>
        <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
          Report Defect – {ASSET_TYPE_LABELS[asset.asset_type]}
        </h1>
        {asset.location_description && (
          <p className="text-sm text-zinc-500 mt-1">{asset.location_description}</p>
        )}
      </div>

      <DefectForm jobId={jobId} assetId={asset.id} />
    </div>
  );
}

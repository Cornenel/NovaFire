import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PhotoUpload } from "@/components/tech/photo-upload";
import { ASSET_TYPE_LABELS } from "@/lib/fsm/labels";
import type { Asset, PhotoStage } from "@/lib/fsm/types";

interface PhotoRow {
  id: string;
  storage_path: string;
  stage: PhotoStage;
  taken_at: string;
}

export default async function AssetPhotosPage({
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

  const { data: photoRows } = await supabase
    .from("photos")
    .select("id, storage_path, stage, taken_at")
    .eq("asset_id", id)
    .order("taken_at", { ascending: false })
    .limit(40);

  const photos = (photoRows ?? []) as PhotoRow[];
  let signedUrls: Record<string, string> = {};

  if (photos.length > 0) {
    const { data: signed } = await supabase.storage
      .from("job-photos")
      .createSignedUrls(
        photos.map((p) => p.storage_path),
        60 * 60
      );
    signedUrls = Object.fromEntries(
      (signed ?? [])
        .filter((s): s is typeof s & { path: string; signedUrl: string } =>
          Boolean(s.path && s.signedUrl)
        )
        .map((s) => [s.path, s.signedUrl])
    );
  }

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
          Photos – {ASSET_TYPE_LABELS[asset.asset_type]}
        </h1>
      </div>

      <div className="mb-6">
        <PhotoUpload jobId={jobId} assetId={asset.id} />
      </div>

      <h2 className="text-sm font-semibold text-zinc-300 mb-3">
        Photo History ({photos.length})
      </h2>
      {photos.length === 0 ? (
        <p className="text-zinc-500 text-sm">No photos for this asset yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => {
            const url = signedUrls[p.storage_path];
            if (!url) return null;
            return (
              <a
                key={p.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square rounded-lg overflow-hidden border border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${p.stage} photo`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-zinc-300 uppercase">
                  {p.stage}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

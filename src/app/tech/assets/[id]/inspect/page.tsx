import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InspectionForm } from "@/components/tech/inspection-form";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import { mapDbAnswers } from "@/lib/checklists/status";
import { CHECKLIST_VERSION } from "@/lib/checklists/version";
import type { Asset } from "@/lib/fsm/types";
import type { OverallEquipmentResult } from "@/lib/checklists/types";

export default async function InspectAssetPage({
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

  const { data: draftHeader } = await supabase
    .from("inspection_checklists")
    .select("id, status, overall_result")
    .eq("job_id", jobId)
    .eq("asset_id", asset.id)
    .eq("checklist_version", CHECKLIST_VERSION)
    .is("completed_at", null)
    .maybeSingle();

  let draftChecklist: {
    id: string;
    answers: ReturnType<typeof mapDbAnswers>;
    overallResult: OverallEquipmentResult | null;
  } | null = null;

  if (draftHeader) {
    const { data: answerRows } = await supabase
      .from("inspection_checklist_answers")
      .select("*")
      .eq("checklist_id", draftHeader.id);
    draftChecklist = {
      id: draftHeader.id,
      answers: mapDbAnswers(answerRows ?? []),
      overallResult: (draftHeader.overall_result as OverallEquipmentResult | null) ?? null,
    };
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
          Inspect {formatAssetDisplayName(asset)}
        </h1>
        {asset.location_description && (
          <p className="text-sm text-zinc-500 mt-1">{asset.location_description}</p>
        )}
      </div>

      <InspectionForm
        jobId={jobId}
        assetId={asset.id}
        assetType={asset.asset_type}
        asset={asset}
        draftChecklist={draftChecklist}
      />
    </div>
  );
}

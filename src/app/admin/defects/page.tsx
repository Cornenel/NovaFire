import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DefectStatusSelect } from "@/components/admin/defect-status-select";
import {
  DEFECT_SEVERITY_LABELS,
  DEFECT_SEVERITY_STYLES,
} from "@/lib/fsm/labels";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import type { AssetType, DefectSeverity, DefectStatus } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

interface DefectRow {
  id: string;
  defect_type: string;
  severity: DefectSeverity;
  status: DefectStatus;
  description: string;
  recommended_action: string | null;
  quote_required: boolean;
  created_at: string;
  asset: {
    asset_code: string;
    asset_type: AssetType;
    size_capacity: string | null;
    asset_medium?: string | null;
    site: { name: string; customer: { name: string } | null } | null;
  } | null;
  job: { id: string; job_number: string } | null;
  technician: { full_name: string } | null;
}

export default async function AdminDefectsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("defects")
    .select(
      `id, defect_type, severity, status, description, recommended_action, quote_required, created_at,
       asset:assets(asset_code, asset_type, size_capacity, asset_medium, site:sites(name, customer:customers(name))),
       job:jobs(id, job_number),
       technician:profiles(full_name)`
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const defects = (data ?? []) as unknown as DefectRow[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-6">
        Defects
      </h1>

      {defects.length === 0 ? (
        <p className="text-zinc-500 text-sm">No defects recorded.</p>
      ) : (
        <div className="space-y-3">
          {defects.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-white/[0.08] nf-glass-panel p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white">
                      {d.defect_type}
                    </p>
                    <span
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border",
                        DEFECT_SEVERITY_STYLES[d.severity]
                      )}
                    >
                      {DEFECT_SEVERITY_LABELS[d.severity]}
                    </span>
                    {d.quote_required && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30">
                        Quote required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {d.asset && (
                      <>
                        <span className="font-mono">{d.asset.asset_code}</span>
                        {" · "}
                        {formatAssetDisplayName(d.asset)}
                        {d.asset.site && (
                          <>
                            {" · "}
                            {d.asset.site.customer?.name} – {d.asset.site.name}
                          </>
                        )}
                      </>
                    )}
                    {d.job && (
                      <>
                        {" · "}
                        <Link
                          href={`/admin/jobs/${d.job.id}`}
                          className="text-sky-400 hover:underline font-mono"
                        >
                          {d.job.job_number}
                        </Link>
                      </>
                    )}
                    {d.technician && <> · {d.technician.full_name}</>}
                  </p>
                </div>
                <DefectStatusSelect defectId={d.id} status={d.status} />
              </div>
              <p className="text-sm text-zinc-300 mt-2">{d.description}</p>
              {d.recommended_action && (
                <p className="text-xs text-zinc-500 mt-1">
                  Recommended: {d.recommended_action}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

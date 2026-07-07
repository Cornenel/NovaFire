import type { DefectSeverity } from "@/lib/fsm/types";
import { createClient } from "@/lib/supabase/server";
import {
  DEFECT_SEVERITY_LABELS,
  DEFECT_SEVERITY_STYLES,
} from "@/lib/fsm/labels";
import { requirePortalSession } from "@/lib/portal/session";
import { loadPortalDefects } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

export default async function PortalDefectsPage() {
  const session = await requirePortalSession();
  const supabase = await createClient();
  const defects = await loadPortalDefects(supabase, session);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-6">
        Defects
      </h1>
      {defects.length === 0 ? (
        <p className="text-sm text-zinc-500">No defects recorded.</p>
      ) : (
        <div className="space-y-3">
          {defects.map((defect) => (
            <div
              key={defect.id}
              className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-white">{defect.defect_type}</p>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border",
                    DEFECT_SEVERITY_STYLES[defect.severity as DefectSeverity]
                  )}
                >
                  {DEFECT_SEVERITY_LABELS[defect.severity as DefectSeverity]}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{defect.description}</p>
              <p className="text-[11px] text-zinc-600 mt-2">
                {(defect.asset as { asset_code?: string; site?: { name?: string } } | null)
                  ?.asset_code ?? "Asset"}{" "}
                ·{" "}
                {(defect.asset as { site?: { name?: string } } | null)?.site?.name ??
                  "Site"}{" "}
                · {defect.status.replaceAll("_", " ")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

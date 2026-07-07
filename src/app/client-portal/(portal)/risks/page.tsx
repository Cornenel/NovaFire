import type { FireRiskSeverity, FireRiskStatus, FireRiskType } from "@/lib/fsm/types";
import { createClient } from "@/lib/supabase/server";
import {
  FIRE_RISK_SEVERITY_LABELS,
  FIRE_RISK_SEVERITY_STYLES,
  FIRE_RISK_STATUS_LABELS,
  FIRE_RISK_STATUS_STYLES,
  FIRE_RISK_TYPE_LABELS,
  isUnresolvedFireRisk,
} from "@/lib/fsm/fire-risks";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/portal/session";
import { loadPortalFireRisks } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

export default async function PortalFireRisksPage() {
  if (!featureFlags.fireRiskRegister) notFound();

  const session = await requirePortalSession();
  const supabase = await createClient();
  const risks = await loadPortalFireRisks(supabase, session);
  const unresolved = risks.filter((risk) =>
    isUnresolvedFireRisk(risk.status as FireRiskStatus)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
        Fire Risks
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Site fire hazards logged by our technicians during service visits.
      </p>

      {unresolved.length > 0 ? (
        <p className="text-sm text-amber-400 mb-4">
          {unresolved.length} unresolved fire risk{unresolved.length === 1 ? "" : "s"} on record.
        </p>
      ) : null}

      {risks.length === 0 ? (
        <p className="text-sm text-zinc-500">No fire risks recorded.</p>
      ) : (
        <div className="space-y-3">
          {risks.map((risk) => (
            <div
              key={risk.id}
              className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <p className="text-sm font-medium text-white">
                  {FIRE_RISK_TYPE_LABELS[risk.risk_type as FireRiskType]}
                </p>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border",
                    FIRE_RISK_SEVERITY_STYLES[risk.severity as FireRiskSeverity]
                  )}
                >
                  {FIRE_RISK_SEVERITY_LABELS[risk.severity as FireRiskSeverity]}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border",
                    FIRE_RISK_STATUS_STYLES[risk.status as FireRiskStatus]
                  )}
                >
                  {FIRE_RISK_STATUS_LABELS[risk.status as FireRiskStatus]}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{risk.description}</p>
              {risk.recommended_action ? (
                <p className="text-xs text-zinc-500 mt-2">
                  Recommended: {risk.recommended_action}
                </p>
              ) : null}
              <p className="text-[11px] text-zinc-600 mt-2">
                {(risk.site as { name?: string } | null)?.name ?? "Site"}
                {risk.location_description ? ` · ${risk.location_description}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

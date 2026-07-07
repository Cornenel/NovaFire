import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  FIRE_RISK_SEVERITY_LABELS,
  FIRE_RISK_SEVERITY_STYLES,
  FIRE_RISK_STATUS_LABELS,
  FIRE_RISK_STATUS_STYLES,
  FIRE_RISK_TYPE_LABELS,
} from "@/lib/fsm/fire-risks";
import { featureFlags } from "@/lib/fsm/feature-flags";
import type { FireRiskSeverity, FireRiskStatus, FireRiskType } from "@/lib/fsm/types";
import { updateFireRiskStatus } from "@/app/admin/fire-risk-actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "Fire Risks | NovaFire Admin" };

export default async function AdminFireRisksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!featureFlags.fireRiskRegister) notFound();

  const { status = "open" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("fire_risks")
    .select(
      "id, risk_type, severity, description, recommended_action, status, location_description, created_at, customer:customers(name), site:sites(name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status === "open") {
    query = query.in("status", ["open", "in_progress"]);
  } else if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: risks } = await query;

  const filters = [
    { key: "open", label: "Open / in progress" },
    { key: "resolved", label: "Resolved" },
    { key: "accepted_risk", label: "Accepted risk" },
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
        Fire Risk Register
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Site fire risk observations separate from equipment defects.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((filter) => (
          <a
            key={filter.key}
            href={`/admin/fire-risks?status=${filter.key}`}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs border",
              status === filter.key
                ? "bg-white/10 text-white border-white/20"
                : "text-zinc-500 border-white/10"
            )}
          >
            {filter.label}
          </a>
        ))}
      </div>

      {(risks ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">No fire risks found.</p>
      ) : (
        <div className="space-y-3">
          {(risks ?? []).map((risk) => (
            <div
              key={risk.id}
              className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-white font-medium">
                    {FIRE_RISK_TYPE_LABELS[risk.risk_type as FireRiskType]}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {(risk.customer as { name?: string } | null)?.name ?? "Customer"} ·{" "}
                    {(risk.site as { name?: string } | null)?.name ?? "Site"}
                    {risk.location_description ? ` · ${risk.location_description}` : ""}
                  </p>
                  <p className="text-sm text-zinc-300 mt-2">{risk.description}</p>
                  {risk.recommended_action ? (
                    <p className="text-xs text-zinc-500 mt-1">
                      Action: {risk.recommended_action}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
              </div>

              {["open", "in_progress"].includes(risk.status) ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {(["in_progress", "resolved", "accepted_risk"] as FireRiskStatus[]).map(
                    (nextStatus) => (
                      <form key={nextStatus} action={updateFireRiskStatus}>
                        <input type="hidden" name="id" value={risk.id} />
                        <input type="hidden" name="status" value={nextStatus} />
                        <button
                          type="submit"
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5"
                        >
                          Mark {FIRE_RISK_STATUS_LABELS[nextStatus]}
                        </button>
                      </form>
                    )
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

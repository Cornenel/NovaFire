import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Check, X, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { getDefectSuggestion } from "@/lib/fsm/defect-knowledge";
import { updateQuoteRecommendationStatus } from "@/app/admin/quote-actions";
import {
  DEFECT_SEVERITY_LABELS,
  DEFECT_SEVERITY_STYLES,
} from "@/lib/fsm/labels";
import { cn } from "@/lib/utils";

export const metadata = { title: "Quote Preparation | NovaFire Admin" };

/**
 * Phase 5 (F7): Defect-to-Quote staging area.
 * Recommendations are generated lazily from open defects (one per defect,
 * idempotent via unique constraint). Recommendations only – no quotes are
 * created and the existing quoting workflow is unchanged.
 */
export default async function QuotePreparationPage() {
  if (!featureFlags.quotePreparation) notFound();

  const supabase = await createClient();

  // 1. Generate staging rows for open defects that don't have one yet
  const { data: openDefects } = await supabase
    .from("defects")
    .select("id, job_id, asset_id, defect_type, recommended_action, quote_group_id, quote_recommendations(id)")
    .eq("status", "open")
    .is("quote_group_id", null);

  const missing = (openDefects ?? []).filter(
    (d) => !d.quote_recommendations || d.quote_recommendations.length === 0
  );
  if (missing.length > 0) {
    await supabase.from("quote_recommendations").upsert(
      missing.map((d) => ({
        defect_id: d.id,
        job_id: d.job_id,
        asset_id: d.asset_id,
        recommended_item:
          getDefectSuggestion(d.defect_type)?.quoteItem ??
          `Remedial work: ${d.defect_type}`,
        notes: d.recommended_action,
      })),
      { onConflict: "defect_id", ignoreDuplicates: true }
    );
  }

  // 2. Load the staging area
  const { data: recsData } = await supabase
    .from("quote_recommendations")
    .select(
      "id, recommended_item, notes, status, created_at, defect:defects(defect_type, severity, description, status), asset:assets(asset_code, site:sites(id, name, customer:customers(name)))"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const recs = (recsData ?? []) as unknown as Array<{
    id: string;
    recommended_item: string;
    notes: string | null;
    status: "suggested" | "accepted" | "dismissed";
    created_at: string;
    defect: {
      defect_type: string;
      severity: "low" | "medium" | "high" | "critical";
      description: string;
      status: string;
    } | null;
    asset: {
      asset_code: string;
      site: { id: string; name: string; customer: { name: string } | null } | null;
    } | null;
  }>;

  const groups = [
    { key: "suggested", label: "Suggested", items: recs.filter((r) => r.status === "suggested") },
    { key: "accepted", label: "Accepted for quoting", items: recs.filter((r) => r.status === "accepted") },
    { key: "dismissed", label: "Dismissed", items: recs.filter((r) => r.status === "dismissed") },
  ];

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-1">
        <FileText className="w-6 h-6 text-red-500" />
        Quote Preparation
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Staging area generated from logged defects. Recommendations only – no
        quotes are created automatically.
      </p>

      {recs.length === 0 ? (
        <p className="text-zinc-500 text-sm">
          No quote recommendations yet – they appear here when defects are
          logged.
        </p>
      ) : (
        <div className="space-y-8">
          {groups
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.key}>
                <h2 className="text-sm font-semibold text-zinc-300 mb-3">
                  {group.label} ({group.items.length})
                </h2>
                <div className="space-y-2">
                  {group.items.map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "rounded-xl border px-4 py-3",
                        r.status === "dismissed"
                          ? "border-white/[0.05] opacity-60"
                          : "border-white/[0.08]",
                        "nf-glass-panel"
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">
                            {r.recommended_item}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {r.defect?.defect_type ?? "Defect"}
                            {r.asset ? (
                              <>
                                {" · "}
                                <span className="font-mono">{r.asset.asset_code}</span>
                              </>
                            ) : null}
                            {r.asset?.site ? (
                              <>
                                {" · "}
                                <Link
                                  href={`/admin/sites/${r.asset.site.id}`}
                                  className="hover:text-white underline-offset-2 hover:underline"
                                >
                                  {r.asset.site.name}
                                </Link>
                                {r.asset.site.customer
                                  ? ` (${r.asset.site.customer.name})`
                                  : ""}
                              </>
                            ) : null}
                          </p>
                          {r.defect?.description && (
                            <p className="text-xs text-zinc-400 mt-1">
                              {r.defect.description}
                            </p>
                          )}
                          {r.notes && (
                            <p className="text-xs text-zinc-500 mt-1 italic">
                              Tech note: {r.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {r.defect && (
                            <span
                              className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full border",
                                DEFECT_SEVERITY_STYLES[r.defect.severity]
                              )}
                            >
                              {DEFECT_SEVERITY_LABELS[r.defect.severity]}
                            </span>
                          )}
                          {r.status !== "accepted" && (
                            <form action={updateQuoteRecommendationStatus}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="status" value="accepted" />
                              <button
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/35 transition-colors"
                                title="Accept for quoting"
                              >
                                <Check className="w-3 h-3" />
                                Accept
                              </button>
                            </form>
                          )}
                          {r.status === "suggested" && (
                            <form action={updateQuoteRecommendationStatus}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="status" value="dismissed" />
                              <button
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                                title="Dismiss"
                              >
                                <X className="w-3 h-3" />
                                Dismiss
                              </button>
                            </form>
                          )}
                          {r.status !== "suggested" && (
                            <form action={updateQuoteRecommendationStatus}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="status" value="suggested" />
                              <button
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-colors"
                                title="Move back to suggested"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

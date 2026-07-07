import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { requirePortalSession } from "@/lib/portal/session";
import { approvePortalQuote, rejectPortalQuote } from "@/app/client-portal/actions";

export default async function PortalQuotesPage() {
  if (!featureFlags.quotePreparation) notFound();

  const session = await requirePortalSession();
  const supabase = await createClient();

  let query = supabase
    .from("quote_recommendations")
    .select(
      "id, recommended_item, notes, status, customer_approved_at, customer_rejected_at, created_at, asset:assets(asset_code, site:sites(name))"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (session.siteScopeId) {
    const { data: scopedAssets } = await supabase
      .from("assets")
      .select("id")
      .eq("site_id", session.siteScopeId);
    const assetIds = (scopedAssets ?? []).map((a) => a.id);
    if (assetIds.length === 0) {
      return (
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Prepared quotes</h1>
          <p className="text-sm text-zinc-500">No quote items available.</p>
        </div>
      );
    }
    query = query.in("asset_id", assetIds);
  }

  const { data: quotes } = await query;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
        Prepared quotes
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Review quote-ready items prepared from defects and service findings. This
        does not create accounting invoices yet.
      </p>

      {(quotes ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">No prepared quotes awaiting review.</p>
      ) : (
        <div className="space-y-3">
          {(quotes ?? []).map((quote) => {
            const asset = quote.asset as {
              asset_code?: string;
              site?: { name?: string };
            } | null;
            const decided = quote.customer_approved_at || quote.customer_rejected_at;

            return (
              <div
                key={quote.id}
                className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-4"
              >
                <p className="text-sm text-white font-medium">{quote.recommended_item}</p>
                {quote.notes ? (
                  <p className="text-xs text-zinc-500 mt-1">{quote.notes}</p>
                ) : null}
                <p className="text-[11px] text-zinc-600 mt-2">
                  {asset?.asset_code ?? "Asset"} · {asset?.site?.name ?? "Site"}
                </p>
                {decided ? (
                  <p className="text-xs mt-3 text-zinc-400">
                    {quote.customer_approved_at
                      ? "You approved this item."
                      : "You declined this item."}
                  </p>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <form action={approvePortalQuote}>
                      <input type="hidden" name="id" value={quote.id} />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/20"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={rejectPortalQuote}>
                      <input type="hidden" name="id" value={quote.id} />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700/40 text-zinc-300 border border-white/10"
                      >
                        Decline
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

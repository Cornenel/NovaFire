import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ComplianceScoreBadge } from "@/components/admin/compliance-score-badge";
import { featureFlags } from "@/lib/fsm/feature-flags";
import {
  calculateComplianceScore,
  detectRevenueOpportunities,
} from "@/lib/fsm/compliance";
import { requirePortalSession } from "@/lib/portal/session";
import { loadPortalAssets, loadPortalSites } from "@/lib/portal/queries";

export default async function PortalCompliancePage() {
  const session = await requirePortalSession();
  const supabase = await createClient();
  const [sites, assets] = await Promise.all([
    loadPortalSites(supabase, session),
    loadPortalAssets(supabase, session),
  ]);

  const siteScores = await Promise.all(
    sites.map(async (site) => {
      const siteAssets = assets.filter((a) => a.site_id === site.id);
      const { count: openDefects } = await supabase
        .from("defects")
        .select("id, asset:assets!inner(site_id)", { count: "exact", head: true })
        .eq("status", "open")
        .eq("asset.site_id", site.id);

      const score =
        featureFlags.complianceScore && siteAssets.length > 0
          ? calculateComplianceScore({
              assets: siteAssets,
              openDefects: openDefects ?? 0,
            })
          : null;

      return { site, score, opportunities: detectRevenueOpportunities(siteAssets) };
    })
  );

  const totalOpenDefects = siteScores.reduce(
    (sum, row) => sum + (row.score?.openDefects ?? 0),
    0
  );
  const overall =
    featureFlags.complianceScore && assets.length > 0
      ? calculateComplianceScore({ assets, openDefects: totalOpenDefects })
      : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-6">
        Compliance
      </h1>

      {overall ? (
        <div className="mb-8 rounded-xl border border-white/[0.08] nf-glass-panel p-4">
          <p className="text-xs text-zinc-500 mb-2">Overall compliance</p>
          <ComplianceScoreBadge result={overall} size="lg" />
        </div>
      ) : (
        <p className="text-sm text-zinc-500 mb-6">
          Compliance scoring is not available for your account yet.
        </p>
      )}

      <div className="space-y-4">
        {siteScores.map(({ site, score, opportunities }) => (
          <div
            key={site.id}
            className="rounded-xl border border-white/[0.08] nf-glass-panel p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/client-portal/sites/${site.id}`}
                  className="text-white font-medium hover:text-red-300"
                >
                  {site.name}
                </Link>
                <p className="text-xs text-zinc-500 mt-1">{site.address}</p>
              </div>
              {score ? <ComplianceScoreBadge result={score} /> : null}
            </div>
            {opportunities.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                {opportunities.slice(0, 3).map((item, index) => (
                  <li key={index}>• {item.recommendation}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { MapPin, ShieldCheck, AlertTriangle, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ComplianceScoreBadge } from "@/components/admin/compliance-score-badge";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { calculateComplianceScore } from "@/lib/fsm/compliance";
import { requirePortalSession } from "@/lib/portal/session";
import {
  loadPortalAssets,
  loadPortalDefects,
  loadPortalJobs,
  loadPortalSites,
} from "@/lib/portal/queries";

export default async function PortalDashboardPage() {
  const session = await requirePortalSession();
  const supabase = await createClient();

  const [sites, assets, jobs, defects] = await Promise.all([
    loadPortalSites(supabase, session),
    loadPortalAssets(supabase, session),
    loadPortalJobs(supabase, session),
    loadPortalDefects(supabase, session),
  ]);

  const openDefects = defects.filter((d) => d.status === "open").length;
  const compliance =
    featureFlags.complianceScore && assets.length > 0
      ? calculateComplianceScore({
          assets,
          openDefects,
        })
      : null;

  const stats = [
    { label: "Sites", value: sites.length, href: "/client-portal/sites" },
    { label: "Assets", value: assets.length, href: "/client-portal/assets" },
    {
      label: "Open defects",
      value: openDefects,
      href: "/client-portal/defects",
    },
    {
      label: "Service reports",
      value: jobs.length,
      href: "/client-portal/reports",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-mono text-violet-400/90 uppercase tracking-[0.2em] mb-1">
          Client Portal
        </p>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
          {session.customer.name}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {session.siteScopeId
            ? "Site-restricted portal access"
            : "Customer-wide portal access"}
        </p>
      </div>

      {compliance ? (
        <div className="mb-8 rounded-xl border border-white/[0.08] nf-glass-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Compliance overview</h2>
          </div>
          <ComplianceScoreBadge result={compliance} size="lg" />
          <Link
            href="/client-portal/compliance"
            className="inline-block text-xs text-red-400 hover:text-red-300 mt-3"
          >
            View compliance details →
          </Link>
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 hover:bg-white/[0.02] transition-colors"
          >
            <p className="text-xs text-zinc-500">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-white/[0.08] nf-glass-panel p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Your sites
          </h2>
          {sites.length === 0 ? (
            <p className="text-sm text-zinc-500">No sites linked yet.</p>
          ) : (
            <ul className="space-y-2">
              {sites.slice(0, 5).map((site) => (
                <li key={site.id}>
                  <Link
                    href={`/client-portal/sites/${site.id}`}
                    className="text-sm text-zinc-300 hover:text-white"
                  >
                    {site.name}
                  </Link>
                  <p className="text-xs text-zinc-600">{site.address}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-white/[0.08] nf-glass-panel p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Recent open defects
          </h2>
          {defects.filter((d) => d.status === "open").length === 0 ? (
            <p className="text-sm text-zinc-500">No open defects.</p>
          ) : (
            <ul className="space-y-2">
              {defects
                .filter((d) => d.status === "open")
                .slice(0, 5)
                .map((defect) => (
                  <li key={defect.id} className="text-sm text-zinc-300">
                    {defect.defect_type}
                    <p className="text-xs text-zinc-600">{defect.description}</p>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-white/[0.08] nf-glass-panel p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Request a service
        </h2>
        <p className="text-sm text-zinc-500 mb-3">
          Need a call-out or scheduled service? Submit a request and our team will
          follow up.
        </p>
        <Link
          href="/client-portal/service-request"
          className="inline-flex text-sm text-red-400 hover:text-red-300"
        >
          Open service request form →
        </Link>
      </section>
    </div>
  );
}

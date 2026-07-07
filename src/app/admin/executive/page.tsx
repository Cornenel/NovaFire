import Link from "next/link";
import { notFound } from "next/navigation";
import { Flame, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ComplianceScoreBadge } from "@/components/admin/compliance-score-badge";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { countComplianceFireRisks } from "@/lib/fsm/fire-risks";
import { loadCustomerCompliance } from "@/lib/fsm/customer-compliance";
import { todayInSA } from "@/lib/fsm/dates";
import type { Asset } from "@/lib/fsm/types";

export const metadata = { title: "Executive Dashboard | NovaFire Admin" };

function weekEndFromToday(): string {
  const today = new Date(`${todayInSA()}T12:00:00`);
  const end = new Date(today);
  end.setDate(end.getDate() + 7);
  return end.toISOString().slice(0, 10);
}

export default async function ExecutiveDashboardPage() {
  if (!featureFlags.executiveDashboard) notFound();

  const supabase = await createClient();
  const today = todayInSA();
  const weekEnd = weekEndFromToday();

  const [
    { count: jobsDueWeek },
    { data: assetsData },
    { count: openDefects },
    { data: fireRisks },
    { count: pressureOverdue },
    { count: quotesSuggested },
    { count: customerApprovalsPending },
    { data: customers },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_date", today)
      .lte("scheduled_date", weekEnd)
      .neq("status", "cancelled")
      .neq("status", "completed"),
    supabase
      .from("assets")
      .select(
        "id, status, next_service_date, annual_service_due_date, pressure_test_due_date, asset_type, location_description, size_capacity, asset_medium, calculated_compliance_status, site_id, site:sites(customer_id, name, customer:customers(name))"
      )
      .neq("status", "removed"),
    supabase
      .from("defects")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("fire_risks")
      .select("id, severity, status, site_id, customer_id, risk_type, description, site:sites(name), customer:customers(name)")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .not("pressure_test_due_date", "is", null)
      .lte("pressure_test_due_date", today)
      .neq("status", "removed"),
    featureFlags.quotePreparation
      ? supabase
          .from("quote_recommendations")
          .select("id", { count: "exact", head: true })
          .eq("status", "suggested")
      : Promise.resolve({ count: 0 }),
    featureFlags.quotePreparation
      ? supabase
          .from("quote_recommendations")
          .select("id", { count: "exact", head: true })
          .is("customer_approved_at", null)
          .is("customer_rejected_at", null)
      : Promise.resolve({ count: 0 }),
    supabase.from("customers").select("id, name").order("name"),
  ]);

  const assets = (assetsData ?? []) as unknown as Array<
    Pick<Asset, "annual_service_due_date" | "next_service_date"> & {
      site: { customer_id: string; name: string; customer: { name: string } | null };
    }
  >;

  const overdueServices = assets.filter((asset) => {
    const due = asset.annual_service_due_date ?? asset.next_service_date;
    return due !== null && due < today;
  }).length;

  const riskCounts = countComplianceFireRisks(
    (fireRisks ?? []) as Array<{ severity: "low" | "medium" | "high" | "critical"; status: "open" | "in_progress" }>
  );

  const customerScores = await Promise.all(
    ((customers ?? []) as Array<{ id: string; name: string }>).map(async (customer) => {
      const score = await loadCustomerCompliance(supabase, customer.id);
      return { customer, score };
    })
  );

  const atRiskCustomers = customerScores
    .filter((row) => row.score && row.score.status === "red")
    .slice(0, 8);

  const stats = [
    { label: "Jobs due this week", value: jobsDueWeek ?? 0, href: "/admin/jobs" },
    { label: "Overdue services", value: overdueServices, href: "/admin/compliance?filter=annual_overdue" },
    { label: "Open defects", value: openDefects ?? 0, href: "/admin/defects" },
    { label: "Critical fire risks", value: riskCounts.criticalUnresolved, href: "/admin/fire-risks" },
    { label: "Pressure tests overdue", value: pressureOverdue ?? 0, href: "/admin/compliance?filter=pressure_overdue" },
    { label: "Quotes to review", value: quotesSuggested ?? 0, href: "/admin/quotes" },
    { label: "Portal approvals pending", value: customerApprovalsPending ?? 0, href: "/admin/quotes" },
    { label: "At-risk customers", value: atRiskCustomers.length, href: "/admin/customers" },
  ];

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em] mb-1">
          Executive Dashboard
        </p>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
          Compliance & Operations
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Read-only overview across customers, risks, services and quote workflow.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 hover:bg-white/[0.02]"
          >
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-white/[0.08] nf-glass-panel p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Compliance risk customers
          </h2>
          {atRiskCustomers.length === 0 ? (
            <p className="text-sm text-zinc-500">No customers below 70% compliance.</p>
          ) : (
            <div className="space-y-3">
              {atRiskCustomers.map(({ customer, score }) => (
                <Link
                  key={customer.id}
                  href={`/admin/customers/${customer.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] px-3 py-2 hover:bg-white/[0.02]"
                >
                  <span className="text-sm text-white">{customer.name}</span>
                  {score ? <ComplianceScoreBadge result={score} /> : null}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-white/[0.08] nf-glass-panel p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            Critical & open fire risks
          </h2>
          {(fireRisks ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No unresolved fire risks.</p>
          ) : (
            <ul className="space-y-2">
              {(fireRisks ?? []).slice(0, 8).map((risk) => (
                <li key={risk.id} className="text-sm text-zinc-300">
                  <span className="text-red-400">{risk.severity}</span> ·{" "}
                  {(risk.customer as { name?: string } | null)?.name ?? "Customer"} ·{" "}
                  {(risk.site as { name?: string } | null)?.name ?? "Site"}
                  <p className="text-xs text-zinc-600">{risk.description}</p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/fire-risks" className="inline-block text-xs text-red-400 mt-3">
            Manage fire risks →
          </Link>
        </section>
      </div>
    </div>
  );
}

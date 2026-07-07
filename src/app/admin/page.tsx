import Link from "next/link";
import { MapPin, AlertTriangle, Plus, BarChart3, ShieldCheck, Flame, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JOB_STATUS_LABELS, JOB_STATUS_STYLES } from "@/lib/fsm/labels";
import { featureFlags } from "@/lib/fsm/feature-flags";
import type { JobStatus } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

function todayInSA(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Johannesburg",
  });
}

interface OverviewJob {
  id: string;
  job_number: string;
  status: JobStatus;
  checked_in_at: string | null;
  checkin_latitude: number | null;
  checkin_longitude: number | null;
  customer: { name: string } | null;
  site: { name: string } | null;
  technician: { full_name: string } | null;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const today = todayInSA();

  const [{ data: todayJobsData }, { count: openDefects }, { count: quoteDefects }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select(
          "id, job_number, status, checked_in_at, checkin_latitude, checkin_longitude, customer:customers(name), site:sites(name), technician:profiles!jobs_assigned_to_fkey(full_name)"
        )
        .eq("scheduled_date", today)
        .neq("status", "cancelled"),
      supabase
        .from("defects")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("defects")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("quote_required", true),
    ]);

  const todayJobs = (todayJobsData ?? []) as unknown as OverviewJob[];

  const byStatus = (status: JobStatus) =>
    todayJobs.filter((j) => j.status === status).length;

  const checkins = todayJobs
    .filter((j) => j.checked_in_at && j.technician)
    .sort((a, b) => (b.checked_in_at ?? "").localeCompare(a.checked_in_at ?? ""));

  const stats: { label: string; value: number; style?: string }[] = [
    { label: "Jobs today", value: todayJobs.length },
    { label: "Not started", value: byStatus("not_started") },
    { label: "Travelling", value: byStatus("travelling") },
    { label: "On site", value: byStatus("on_site") },
    { label: "Completed", value: byStatus("completed") },
    { label: "Awaiting parts", value: byStatus("awaiting_parts") },
  ];

  const quickLinks = [
    ...(featureFlags.complianceDashboard
      ? [{ href: "/admin/compliance", label: "Compliance", icon: ShieldCheck }]
      : []),
    ...(featureFlags.executiveDashboard
      ? [{ href: "/admin/executive", label: "Executive", icon: BarChart3 }]
      : []),
    ...(featureFlags.fireRiskRegister
      ? [{ href: "/admin/fire-risks", label: "Fire Risks", icon: Flame }]
      : []),
    ...(featureFlags.customerPortal
      ? [{ href: "/client-portal/login", label: "Client Portal", icon: ExternalLink }]
      : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em] mb-1">
            Dispatch Overview
          </p>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
            Today&apos;s Operations
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {featureFlags.executiveDashboard ? (
            <Link
              href="/admin/executive"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-200 text-sm font-medium transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Executive
            </Link>
          ) : null}
          <Link
            href="/admin/jobs/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Job
          </Link>
        </div>
      </div>

      {quickLinks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <item.icon className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-sm font-medium text-white">{item.label}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-4"
          >
            <p className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
              {s.value}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's jobs */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Today&apos;s Jobs
          </h2>
          {todayJobs.length === 0 ? (
            <p className="text-zinc-500 text-sm">No jobs scheduled today.</p>
          ) : (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
              {todayJobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/admin/jobs/${j.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">
                      {j.customer?.name} · {j.site?.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {j.job_number} ·{" "}
                      {j.technician?.full_name ?? "Unassigned"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full border shrink-0",
                      JOB_STATUS_STYLES[j.status]
                    )}
                  >
                    {JOB_STATUS_LABELS[j.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Defects */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Defects
            </h2>
            <Link
              href="/admin/defects"
              className="flex items-center gap-4 rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-white">
                  <span className="font-bold">{openDefects ?? 0}</span> open
                  defects
                </p>
                <p className="text-xs text-zinc-500">
                  {quoteDefects ?? 0} requiring quotes
                </p>
              </div>
            </Link>
          </div>

          {/* Technician locations */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Technician Check-Ins (Today)
            </h2>
            {checkins.length === 0 ? (
              <p className="text-zinc-500 text-sm">No site check-ins yet.</p>
            ) : (
              <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
                {checkins.map((j) => (
                  <div
                    key={j.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {j.technician?.full_name}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {j.site?.name} ·{" "}
                        {new Date(j.checked_in_at!).toLocaleTimeString("en-ZA", {
                          timeZone: "Africa/Johannesburg",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {j.checkin_latitude && j.checkin_longitude && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${j.checkin_latitude},${j.checkin_longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-sky-400 shrink-0"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Map
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

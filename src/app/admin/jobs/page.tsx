import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  JOB_PRIORITY_LABELS,
  JOB_PRIORITY_STYLES,
  JOB_STATUS_LABELS,
  JOB_STATUS_STYLES,
  JOB_TYPE_LABELS,
  resolveJobTypeLabel,
} from "@/lib/fsm/labels";
import type { JobPriority, JobStatus, JobType } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

interface JobRow {
  id: string;
  job_number: string;
  scheduled_date: string;
  job_type: JobType;
  import_source: string | null;
  service_category: string | null;
  priority: JobPriority;
  status: JobStatus;
  customer: { name: string } | null;
  site: { name: string } | null;
  technician: { full_name: string } | null;
}

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "not_started", label: "Not Started" },
  { value: "travelling", label: "Travelling" },
  { value: "on_site", label: "On Site" },
  { value: "awaiting_parts", label: "Awaiting Parts" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("jobs")
    .select(
      "id, job_number, scheduled_date, job_type, import_source, service_category, priority, status, customer:customers(name), site:sites(name), technician:profiles!jobs_assigned_to_fkey(full_name)"
    )
    .order("scheduled_date", { ascending: false })
    .limit(100);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data } = await query;
  const jobs = (data ?? []) as unknown as JobRow[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
          Jobs
        </h1>
        <Link
          href="/admin/jobs/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Job
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/admin/jobs" : `/admin/jobs?status=${f.value}`}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              statusFilter === f.value
                ? "bg-red-600/20 border-red-500/40 text-red-400"
                : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {jobs.length === 0 ? (
        <p className="text-zinc-500 text-sm">No jobs found.</p>
      ) : (
        <div className="rounded-xl border border-white/[0.08] nf-glass-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left">
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Job</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Date</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Customer / Site</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Technician</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Priority</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/jobs/${j.id}`}
                      className="font-mono text-xs text-sky-400 hover:underline"
                    >
                      {j.job_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {j.scheduled_date}
                  </td>
                  <td className="px-4 py-3 text-zinc-200">
                    {j.customer?.name}
                    <span className="text-zinc-500"> · {j.site?.name}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {j.technician?.full_name ?? (
                      <span className="text-amber-500/80">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {resolveJobTypeLabel(j)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap",
                        JOB_PRIORITY_STYLES[j.priority]
                      )}
                    >
                      {JOB_PRIORITY_LABELS[j.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap",
                        JOB_STATUS_STYLES[j.status]
                      )}
                    >
                      {JOB_STATUS_LABELS[j.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

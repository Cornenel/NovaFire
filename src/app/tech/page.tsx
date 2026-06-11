import { createClient } from "@/lib/supabase/server";
import { JobCard } from "@/components/tech/job-card";
import { OfflinePrefetch } from "@/components/tech/offline-prefetch";
import type { JobPriority, JobWithRelations } from "@/lib/fsm/types";
import { AlertTriangle } from "lucide-react";

/** Daily job dashboard – today's assigned jobs for the signed-in technician. */

const PRIORITY_ORDER: Record<JobPriority, number> = {
  emergency: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function todayInSA(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Johannesburg",
  });
}

export default async function TechDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayInSA();

  const { data: todayJobs } = await supabase
    .from("jobs")
    .select("*, customer:customers(*), site:sites(*)")
    .eq("assigned_to", user!.id)
    .eq("scheduled_date", today)
    .neq("status", "cancelled")
    .order("created_at");

  const { data: overdueJobs } = await supabase
    .from("jobs")
    .select("*, customer:customers(*), site:sites(*)")
    .eq("assigned_to", user!.id)
    .lt("scheduled_date", today)
    .in("status", ["not_started", "travelling", "on_site", "awaiting_parts"])
    .order("scheduled_date");

  const jobs = ((todayJobs ?? []) as JobWithRelations[]).sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
  const overdue = (overdueJobs ?? []) as JobWithRelations[];

  const completed = jobs.filter((j) => j.status === "completed").length;
  const remaining = jobs.length - completed;

  // Pages to cache for offline work: today's job details + their site assets
  const activeJobs = [...jobs, ...overdue].filter((j) => j.status !== "completed");
  const siteIds = Array.from(new Set(activeJobs.map((j) => j.site_id)));
  let prefetchUrls = activeJobs.map((j) => `/tech/jobs/${j.id}`);
  if (siteIds.length > 0) {
    const { data: siteAssets } = await supabase
      .from("assets")
      .select("id, site_id")
      .in("site_id", siteIds);
    const jobBySite = new Map(activeJobs.map((j) => [j.site_id, j.id]));
    for (const a of siteAssets ?? []) {
      const jobId = jobBySite.get(a.site_id);
      if (jobId) {
        prefetchUrls.push(
          `/tech/assets/${a.id}?job=${jobId}`,
          `/tech/assets/${a.id}/inspect?job=${jobId}`,
          `/tech/assets/${a.id}/defect?job=${jobId}`
        );
      }
    }
  }
  prefetchUrls = prefetchUrls.slice(0, 60);

  const dateLabel = new Date().toLocaleDateString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <OfflinePrefetch urls={prefetchUrls} />
      <div className="mb-5">
        <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em] mb-1">
          Today&apos;s Jobs
        </p>
        <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
          {dateLabel}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { label: "Assigned", value: jobs.length },
          { label: "Done", value: completed },
          { label: "Remaining", value: remaining },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.08] nf-glass-panel px-3 py-3 text-center"
          >
            <p className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
              {s.value}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Overdue ({overdue.length})
          </h2>
          <div className="space-y-3">
            {overdue.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Today */}
      {jobs.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-8 text-center">
          <p className="text-zinc-400 text-sm">No jobs scheduled for today.</p>
          <p className="text-zinc-600 text-xs mt-1">
            Jobs assigned by dispatch will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

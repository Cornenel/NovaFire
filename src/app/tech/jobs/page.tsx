import { createClient } from "@/lib/supabase/server";
import { JobCard } from "@/components/tech/job-card";
import type { JobWithRelations } from "@/lib/fsm/types";

/** All assigned jobs – upcoming and recently completed. */

export default async function TechJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("jobs")
    .select("*, customer:customers(*), site:sites(*)")
    .eq("assigned_to", user!.id)
    .neq("status", "cancelled")
    .order("scheduled_date", { ascending: false })
    .limit(50);

  const jobs = (data ?? []) as JobWithRelations[];
  const open = jobs
    .filter((j) => j.status !== "completed")
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  const done = jobs.filter((j) => j.status === "completed");

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em] mb-1">
          My Jobs
        </p>
        <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
          Open & Completed
        </h1>
      </div>

      <h2 className="text-sm font-semibold text-zinc-300 mb-3">
        Open ({open.length})
      </h2>
      {open.length === 0 ? (
        <p className="text-zinc-500 text-sm mb-6">No open jobs.</p>
      ) : (
        <div className="space-y-3 mb-8">
          {open.map((job) => (
            <div key={job.id}>
              <p className="text-[11px] text-zinc-600 mb-1.5 font-mono">
                {job.scheduled_date}
              </p>
              <JobCard job={job} />
            </div>
          ))}
        </div>
      )}

      <h2 className="text-sm font-semibold text-zinc-300 mb-3">
        Completed ({done.length})
      </h2>
      {done.length === 0 ? (
        <p className="text-zinc-500 text-sm">Nothing completed yet.</p>
      ) : (
        <div className="space-y-3">
          {done.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

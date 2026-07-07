import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JOB_STATUS_LABELS } from "@/lib/fsm/labels";
import type { JobStatus } from "@/lib/fsm/types";
import { requirePortalSession } from "@/lib/portal/session";
import { loadPortalJobs } from "@/lib/portal/queries";

export default async function PortalReportsPage() {
  const session = await requirePortalSession();
  const supabase = await createClient();
  const jobs = await loadPortalJobs(supabase, session);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
        Service reports & certificates
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Download PDF service reports for completed visits. Historical reports are
        always retained.
      </p>

      {jobs.length === 0 ? (
        <p className="text-sm text-zinc-500">No completed service visits yet.</p>
      ) : (
        <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="text-sm text-white font-mono">{job.job_number}</p>
                <p className="text-xs text-zinc-500">
                  {(job.site as { name?: string } | null)?.name ?? "Site"} ·{" "}
                  {job.scheduled_date} · {JOB_STATUS_LABELS[job.status as JobStatus]}
                </p>
              </div>
              <Link
                href={`/api/reports/${job.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300"
              >
                <FileText className="w-3.5 h-3.5" />
                Download PDF
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

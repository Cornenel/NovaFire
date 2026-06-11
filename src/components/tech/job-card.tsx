import Link from "next/link";
import { MapPin, User, ChevronRight } from "lucide-react";
import {
  JOB_PRIORITY_LABELS,
  JOB_PRIORITY_STYLES,
  JOB_STATUS_LABELS,
  JOB_STATUS_STYLES,
  JOB_TYPE_LABELS,
} from "@/lib/fsm/labels";
import type { JobWithRelations } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

export function JobCard({ job }: { job: JobWithRelations }) {
  return (
    <Link
      href={`/tech/jobs/${job.id}`}
      className="block rounded-xl border border-white/[0.08] nf-glass-panel p-4 active:bg-white/[0.04] transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-[11px] font-mono text-zinc-500">{job.job_number}</p>
          <h3 className="font-semibold text-white truncate">
            {job.customer.name}
          </h3>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0 mt-1" />
      </div>

      <div className="space-y-1.5 mb-3">
        <p className="flex items-center gap-2 text-sm text-zinc-400">
          <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="truncate">
            {job.site.name} · {job.site.address}
          </span>
        </p>
        {job.contact_person && (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="truncate">{job.contact_person}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white/[0.04] text-zinc-300 border-white/10">
          {JOB_TYPE_LABELS[job.job_type]}
        </span>
        <span
          className={cn(
            "text-[11px] px-2 py-0.5 rounded-full border",
            JOB_PRIORITY_STYLES[job.priority]
          )}
        >
          {JOB_PRIORITY_LABELS[job.priority]}
        </span>
        <span
          className={cn(
            "text-[11px] px-2 py-0.5 rounded-full border ml-auto",
            JOB_STATUS_STYLES[job.status]
          )}
        >
          {JOB_STATUS_LABELS[job.status]}
        </span>
      </div>
    </Link>
  );
}

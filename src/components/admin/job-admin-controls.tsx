"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { reassignJob, cancelJob } from "@/app/admin/actions";

export function JobAdminControls({
  jobId,
  assignedTo,
  technicians,
  canCancel,
}: {
  jobId: string;
  assignedTo: string | null;
  technicians: Array<{ id: string; full_name: string }>;
  canCancel: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        defaultValue={assignedTo ?? ""}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() => reassignJob(jobId, e.target.value || null))
        }
        className="px-3 py-2 rounded-lg bg-[#171717] border border-white/10 text-zinc-200 text-sm focus:border-red-500/50 focus:outline-none"
      >
        <option value="">Unassigned</option>
        {technicians.map((t) => (
          <option key={t.id} value={t.id}>
            {t.full_name}
          </option>
        ))}
      </select>

      {canCancel && (
        <button
          onClick={() => {
            if (window.confirm("Cancel this job?")) {
              startTransition(() => cancelJob(jobId));
            }
          }}
          disabled={isPending}
          className="px-3 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          Cancel Job
        </button>
      )}

      {isPending && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
    </div>
  );
}

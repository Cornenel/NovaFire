"use client";

import { useTransition } from "react";
import { updateDefectStatus } from "@/app/admin/actions";

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export function DefectStatusSelect({
  defectId,
  status,
}: {
  defectId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() => updateDefectStatus(defectId, e.target.value))
      }
      className="px-2.5 py-1.5 rounded-lg bg-[#171717] border border-white/10 text-zinc-200 text-xs focus:border-red-500/50 focus:outline-none disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

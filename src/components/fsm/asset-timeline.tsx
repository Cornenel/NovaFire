import Link from "next/link";
import { CalendarClock, FileText } from "lucide-react";
import type { AssetTimelineEntry } from "@/lib/fsm/historical-records";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<
  NonNullable<AssetTimelineEntry["tone"]>,
  { dot: string; border: string; title: string }
> = {
  neutral: {
    dot: "bg-zinc-400",
    border: "border-white/[0.08]",
    title: "text-zinc-200",
  },
  positive: {
    dot: "bg-emerald-400",
    border: "border-emerald-500/20",
    title: "text-emerald-300",
  },
  warning: {
    dot: "bg-amber-400",
    border: "border-amber-500/20",
    title: "text-amber-300",
  },
  danger: {
    dot: "bg-red-400",
    border: "border-red-500/20",
    title: "text-red-300",
  },
  future: {
    dot: "bg-sky-400",
    border: "border-sky-500/20",
    title: "text-sky-300",
  },
};

function formatTimelineDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AssetTimeline({
  entries,
  assetCode,
  assetLabel,
  customerAssetNumber,
}: {
  entries: AssetTimelineEntry[];
  assetCode: string;
  assetLabel: string;
  customerAssetNumber?: string | null;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No historical records for this asset yet.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-[11px] font-mono text-zinc-500">{assetCode}</p>
        {customerAssetNumber ? (
          <p className="text-xs text-zinc-500 mt-0.5">Asset #{customerAssetNumber}</p>
        ) : null}
        <p className="text-sm font-medium text-white mt-1">{assetLabel}</p>
      </div>

      <ol className="relative border-l border-white/10 ml-2 space-y-4">
        {entries.map((entry) => {
          const tone = entry.tone ?? "neutral";
          const styles = TONE_STYLES[tone];
          const isFuture = entry.kind === "next_service";

          return (
            <li key={entry.id} className="relative pl-6">
              <span
                className={cn(
                  "absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[#0a0a0a]",
                  styles.dot
                )}
              />
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 nf-glass-panel",
                  styles.border,
                  isFuture && "bg-sky-500/[0.03]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium", styles.title)}>
                      {isFuture ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5" />
                          {entry.title}
                        </span>
                      ) : (
                        entry.title
                      )}
                    </p>
                    {entry.detail ? (
                      <p className="text-xs text-zinc-500 mt-1">{entry.detail}</p>
                    ) : null}
                    {entry.jobNumber ? (
                      <p className="text-[11px] text-zinc-600 mt-1 font-mono">
                        {entry.jobNumber}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-zinc-500 shrink-0">
                    {isFuture && entry.detail
                      ? entry.detail
                      : formatTimelineDate(entry.date)}
                  </span>
                </div>

                {entry.reportHref ? (
                  <Link
                    href={entry.reportHref}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-red-400 hover:text-red-300"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Download report
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

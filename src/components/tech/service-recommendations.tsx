"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Wrench } from "lucide-react";

/**
 * F4: Auto Service Recommendations – display-only panel. Makes no
 * modifications and adds no mandatory steps; the technician decides what
 * (if anything) to act on.
 */
export function ServiceRecommendations({
  recommendations,
  title = "Recommended Service Actions",
}: {
  recommendations: string[];
  title?: string;
}) {
  const [open, setOpen] = useState(true);

  if (recommendations.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-amber-300">
          <Wrench className="w-4 h-4" />
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-3">
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-100/90">
                <span className="text-amber-500 mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-zinc-600 mt-2">
            Recommendations only – nothing has been changed automatically.
          </p>
        </div>
      )}
    </div>
  );
}

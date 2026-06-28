"use client";

import { useActionState } from "react";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  recheckExistingCompliance,
  type ComplianceRecheckState,
} from "@/app/admin/compliance/actions";

const initialState: ComplianceRecheckState = { ok: false };

export function ComplianceRecheckButton() {
  const [state, action, pending] = useActionState(
    recheckExistingCompliance,
    initialState
  );
  const topReasons = Object.entries(state.summary?.reasonCounts ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-200">
            Existing Report Compliance Recheck
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Recalculates imported/historical extinguisher records using the
            current compliance engine. Raw Zoho/report data is preserved.
          </p>
        </div>
        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Recheck Compliance for Existing Reports
          </button>
        </form>
      </div>

      {state.error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{state.error}</p>
        </div>
      )}

      {state.summary && (
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-200">
              Checked {state.summary.checked} extinguisher record
              {state.summary.checked === 1 ? "" : "s"}; updated{" "}
              {state.summary.updated}.{" "}
              {state.summary.changedNonCompliantToCompliant} changed from
              non-compliant to compliant.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <SummaryStat label="Compliant" value={state.summary.compliant} />
            <SummaryStat label="Non-compliant" value={state.summary.nonCompliant} />
            <SummaryStat label="Warning" value={state.summary.warning} />
            <SummaryStat label="Unknown" value={state.summary.unknown} />
          </div>
          {topReasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-1">
                Top remaining reasons
              </p>
              <ul className="space-y-1">
                {topReasons.map(([reason, count]) => (
                  <li key={reason} className="text-xs text-zinc-500">
                    {count} - {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-zinc-500">{label}</p>
    </div>
  );
}

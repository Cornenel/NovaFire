"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { runOrQueue } from "@/lib/offline/outbox";
import { getLocalUserId } from "@/lib/offline/operations";
import {
  DEFECT_SEVERITY_LABELS,
} from "@/lib/fsm/labels";
import type { DefectSeverity } from "@/lib/fsm/types";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { getDefectSuggestion } from "@/lib/fsm/defect-knowledge";
import { PhotoUpload } from "./photo-upload";
import { VoiceNoteButton } from "./voice-note-button";
import { cn } from "@/lib/utils";

const DEFECT_TYPES = [
  "Pressure loss",
  "Corrosion",
  "Damaged hose / nozzle",
  "Seal broken",
  "Safety pin missing",
  "Missing signage",
  "Obstructed access",
  "Physical damage",
  "Leak",
  "Expired / overdue service",
  "Other",
];

const SEVERITIES: DefectSeverity[] = ["low", "medium", "high", "critical"];

const SEVERITY_ACTIVE_STYLES: Record<DefectSeverity, string> = {
  low: "bg-zinc-500/25 border-zinc-400/50 text-zinc-200",
  medium: "bg-sky-600/25 border-sky-500/50 text-sky-400",
  high: "bg-amber-600/25 border-amber-500/50 text-amber-400",
  critical: "bg-red-600/25 border-red-500/50 text-red-400",
};

export function DefectForm({
  jobId,
  assetId,
}: {
  jobId: string;
  assetId: string;
}) {
  const router = useRouter();
  const [defectType, setDefectType] = useState("");
  const [severity, setSeverity] = useState<DefectSeverity>("medium");
  const [description, setDescription] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [quoteRequired, setQuoteRequired] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wasQueued, setWasQueued] = useState(false);
  const [isPending, setIsPending] = useState(false);
  // Client-generated so the operation is idempotent when replayed offline
  const [defectId] = useState(() => crypto.randomUUID());

  const canSubmit = defectType !== "" && description.trim().length > 0;

  // Phase 5 (F3): suggestions only – technician always has final control
  const suggestion = featureFlags.defectRecommendations
    ? getDefectSuggestion(defectType)
    : null;

  async function handleSubmit() {
    setError("");
    setIsPending(true);

    const technicianId = await getLocalUserId();
    if (!technicianId) {
      setError("Session expired – please sign in again.");
      setIsPending(false);
      return;
    }

    const res = await runOrQueue({
      type: "defect",
      payload: {
        id: defectId,
        jobId,
        assetId,
        technicianId,
        defectType,
        severity,
        description: description.trim(),
        recommendedAction: recommendedAction.trim() || null,
        quoteRequired,
      },
    });

    setIsPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setWasQueued(res.queued);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">Defect recorded</p>
            <p className="text-xs text-zinc-400">
              {wasQueued
                ? "Saved on this device – will sync when signal returns."
                : "Add photo evidence below, or finish."}
            </p>
          </div>
        </div>

        <PhotoUpload jobId={jobId} assetId={assetId} defectId={defectId} />

        <button
          onClick={() => {
            router.push(`/tech/assets/${assetId}?job=${jobId}`);
            router.refresh();
          }}
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Defect type */}
      <div>
        <p className="text-sm text-zinc-400 mb-2">Defect type</p>
        <div className="flex flex-wrap gap-1.5">
          {DEFECT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDefectType(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                defectType === t
                  ? "bg-red-600/25 border-red-500/50 text-red-400"
                  : "bg-white/[0.03] border-white/10 text-zinc-400"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Phase 5 (F3): suggested action / severity / parts (optional) */}
      {suggestion && (
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.05] px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-sky-300">
            Suggested for “{defectType}”
          </p>
          <p className="text-sm text-zinc-300">{suggestion.action}</p>
          {suggestion.parts.length > 0 && (
            <p className="text-xs text-zinc-500">
              Parts: {suggestion.parts.join(", ")}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                if (!recommendedAction.trim())
                  setRecommendedAction(suggestion.action);
                setSeverity(suggestion.severity);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600/25 border border-sky-500/40 text-sky-300 hover:bg-sky-600/40 transition-colors"
            >
              Apply suggestion
            </button>
            <span className="text-[10px] text-zinc-600 self-center">
              Suggestion only – you stay in control.
            </span>
          </div>
        </div>
      )}

      {/* Severity */}
      <div>
        <p className="text-sm text-zinc-400 mb-2">Severity</p>
        <div className="grid grid-cols-4 gap-1.5">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={cn(
                "py-2 rounded-lg text-xs font-semibold border transition-colors",
                severity === s
                  ? SEVERITY_ACTIVE_STYLES[s]
                  : "bg-white/[0.03] border-white/10 text-zinc-500"
              )}
            >
              {DEFECT_SEVERITY_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        {/* Phase 5 (F2): optional voice notes – typing workflow unchanged */}
        {featureFlags.voiceNotes && (
          <div className="flex justify-end mb-1.5">
            <VoiceNoteButton
              onTranscript={(text) =>
                setDescription((prev) => (prev ? `${prev} ${text}` : text))
              }
            />
          </div>
        )}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the defect…"
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        />
      </div>

      <div>
        {featureFlags.voiceNotes && (
          <div className="flex justify-end mb-1.5">
            <VoiceNoteButton
              onTranscript={(text) =>
                setRecommendedAction((prev) => (prev ? `${prev} ${text}` : text))
              }
            />
          </div>
        )}
        <textarea
          value={recommendedAction}
          onChange={(e) => setRecommendedAction(e.target.value)}
          placeholder="Recommended action (optional)"
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        />
      </div>

      <label className="flex items-center justify-between rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3 cursor-pointer">
        <span className="text-sm text-zinc-200">Quote required</span>
        <input
          type="checkbox"
          checked={quoteRequired}
          onChange={(e) => setQuoteRequired(e.target.checked)}
          className="w-5 h-5 accent-red-600"
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isPending}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <AlertTriangle className="w-4 h-4" />
        )}
        Record Defect
      </button>
    </div>
  );
}

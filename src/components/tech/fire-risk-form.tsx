"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Flame, Loader2 } from "lucide-react";
import { runOrQueue } from "@/lib/offline/outbox";
import { getLocalUserId } from "@/lib/offline/operations";
import {
  FIRE_RISK_SEVERITY_LABELS,
  FIRE_RISK_TYPE_LABELS,
  FIRE_RISK_TYPES,
} from "@/lib/fsm/fire-risks";
import type { FireRiskSeverity, FireRiskType } from "@/lib/fsm/types";
import { VoiceNoteButton } from "./voice-note-button";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { cn } from "@/lib/utils";

const SEVERITIES: FireRiskSeverity[] = ["low", "medium", "high", "critical"];

const SEVERITY_ACTIVE_STYLES: Record<FireRiskSeverity, string> = {
  low: "bg-zinc-500/25 border-zinc-400/50 text-zinc-200",
  medium: "bg-sky-600/25 border-sky-500/50 text-sky-400",
  high: "bg-amber-600/25 border-amber-500/50 text-amber-400",
  critical: "bg-red-600/25 border-red-500/50 text-red-400",
};

export function FireRiskForm({
  jobId,
  customerId,
  siteId,
  defaultLocation,
}: {
  jobId: string;
  customerId: string;
  siteId: string;
  defaultLocation?: string | null;
}) {
  const router = useRouter();
  const [riskType, setRiskType] = useState<FireRiskType>("fire_hazard");
  const [severity, setSeverity] = useState<FireRiskSeverity>("medium");
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [description, setDescription] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wasQueued, setWasQueued] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [riskId] = useState(() => crypto.randomUUID());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    setError("");
    setIsPending(true);

    const technicianId = await getLocalUserId();
    if (!technicianId) {
      setError("Session expired – please sign in again.");
      setIsPending(false);
      return;
    }

    const res = await runOrQueue({
      type: "fire_risk",
      payload: {
        id: riskId,
        jobId,
        customerId,
        siteId,
        technicianId,
        riskType,
        severity,
        locationDescription: location || null,
        description: description.trim(),
        recommendedAction: recommendedAction || null,
      },
    });

    setIsPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }

    setSubmitted(true);
    setWasQueued(Boolean(res.queued));
    router.refresh();
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <p className="text-white font-medium">Fire risk logged</p>
        <p className="text-sm text-zinc-500 mt-1">
          {wasQueued
            ? "Saved on this device – will sync when signal returns."
            : "Recorded on this service visit."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2 text-red-400">
        <Flame className="w-4 h-4" />
        <p className="text-sm font-medium">Log fire risk observation</p>
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-2">Risk type</label>
        <select
          value={riskType}
          onChange={(e) => setRiskType(e.target.value as FireRiskType)}
          className="w-full px-3 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white text-sm"
        >
          {FIRE_RISK_TYPES.map((type) => (
            <option key={type} value={type}>
              {FIRE_RISK_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-2">Severity</label>
        <div className="grid grid-cols-4 gap-2">
          {SEVERITIES.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setSeverity(level)}
              className={cn(
                "py-2 rounded-lg border text-xs font-medium transition-colors",
                severity === level
                  ? SEVERITY_ACTIVE_STYLES[level]
                  : "border-white/10 text-zinc-500"
              )}
            >
              {FIRE_RISK_SEVERITY_LABELS[level]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-2">Location</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Kitchen exit, loading bay"
          className="w-full px-3 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-2">Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
          className="w-full px-3 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white text-sm"
        />
        {featureFlags.voiceNotes ? (
          <VoiceNoteButton
            onTranscript={(text) =>
              setDescription((prev) => (prev ? `${prev} ${text}` : text))
            }
            className="mt-2"
          />
        ) : null}
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-2">Recommended action</label>
        <textarea
          value={recommendedAction}
          onChange={(e) => setRecommendedAction(e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white text-sm"
        />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Save fire risk
      </button>
    </form>
  );
}

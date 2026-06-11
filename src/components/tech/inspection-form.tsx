"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { runOrQueue } from "@/lib/offline/outbox";
import { getLocalUserId } from "@/lib/offline/operations";
import { getChecklistForAssetType } from "@/lib/fsm/checklists";
import { addMonths, todayInSA } from "@/lib/fsm/dates";
import type { AssetType, InspectionResult } from "@/lib/fsm/types";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { PhotoUpload } from "./photo-upload";
import { ServiceRecommendations } from "./service-recommendations";
import { VoiceNoteButton } from "./voice-note-button";
import { cn } from "@/lib/utils";

const EXTINGUISHER_TYPES: AssetType[] = [
  "fire_extinguisher",
  "co2_unit",
  "dcp_unit",
];

export function InspectionForm({
  jobId,
  assetId,
  assetType,
}: {
  jobId: string;
  assetId: string;
  assetType: AssetType;
}) {
  const router = useRouter();
  const items = useMemo(() => getChecklistForAssetType(assetType), [assetType]);

  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [requiresRefill, setRequiresRefill] = useState(false);
  const [requiresPressureTest, setRequiresPressureTest] = useState(false);
  const [resultOverride, setResultOverride] = useState<InspectionResult | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wasQueued, setWasQueued] = useState(false);
  const [isPending, setIsPending] = useState(false);
  // Client-generated so the operation is idempotent when replayed offline
  const [inspectionId] = useState(() => crypto.randomUUID());

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === items.length;
  const hasFailures = Object.values(answers).some((v) => !v);
  const suggestedResult: InspectionResult = hasFailures ? "fail" : "pass";
  const result = resultOverride ?? suggestedResult;

  function setAnswer(id: string, value: boolean) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit() {
    setError("");
    setIsPending(true);

    const technicianId = await getLocalUserId();
    if (!technicianId) {
      setError("Session expired – please sign in again.");
      setIsPending(false);
      return;
    }

    const today = todayInSA();
    const res = await runOrQueue({
      type: "inspection",
      payload: {
        id: inspectionId,
        jobId,
        assetId,
        technicianId,
        assetType,
        checklist: answers,
        result,
        requiresRefill,
        requiresPressureTest,
        notes: notes || null,
        serviceDate: today,
        nextServiceDate: addMonths(today, 12),
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

  // Phase 5 (F4): display-only service recommendations from this inspection
  const serviceRecommendations: string[] = [];
  if (featureFlags.serviceRecommendations) {
    if (requiresRefill) serviceRecommendations.push("This unit requires a refill.");
    if (requiresPressureTest)
      serviceRecommendations.push("This unit requires a hydro / pressure test.");
    for (const item of items) {
      if (answers[item.id] === false)
        serviceRecommendations.push(`Attend to failed check: ${item.label}.`);
    }
  }

  // Post-submit: photo step
  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">
              Inspection recorded – {result.toUpperCase()}
            </p>
            <p className="text-xs text-zinc-400">
              {wasQueued
                ? "Saved on this device – will sync when signal returns."
                : "Add photo evidence below, or finish."}
            </p>
          </div>
        </div>

        {/* Phase 5 (F4): recommendations only – technician approval required */}
        <ServiceRecommendations recommendations={serviceRecommendations} />

        <PhotoUpload
          jobId={jobId}
          assetId={assetId}
          inspectionId={inspectionId}
        />

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
      {/* Checklist */}
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
        {items.map((item) => {
          const value = answers[item.id];
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="text-sm text-zinc-200">{item.label}</span>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setAnswer(item.id, true)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                    value === true
                      ? "bg-emerald-600/25 border-emerald-500/50 text-emerald-400"
                      : "bg-white/[0.03] border-white/10 text-zinc-500"
                  )}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setAnswer(item.id, false)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                    value === false
                      ? "bg-red-600/25 border-red-500/50 text-red-400"
                      : "bg-white/[0.03] border-white/10 text-zinc-500"
                  )}
                >
                  Issue
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-zinc-500">
        {answeredCount}/{items.length} items checked
      </p>

      {/* Extinguisher extras */}
      {EXTINGUISHER_TYPES.includes(assetType) && (
        <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
          <label className="flex items-center justify-between px-4 py-3 cursor-pointer">
            <span className="text-sm text-zinc-200">Requires refill</span>
            <input
              type="checkbox"
              checked={requiresRefill}
              onChange={(e) => setRequiresRefill(e.target.checked)}
              className="w-5 h-5 accent-red-600"
            />
          </label>
          <label className="flex items-center justify-between px-4 py-3 cursor-pointer">
            <span className="text-sm text-zinc-200">Requires pressure test</span>
            <input
              type="checkbox"
              checked={requiresPressureTest}
              onChange={(e) => setRequiresPressureTest(e.target.checked)}
              className="w-5 h-5 accent-red-600"
            />
          </label>
        </div>
      )}

      {/* Result */}
      <div>
        <p className="text-sm text-zinc-400 mb-2">
          Result{" "}
          {allAnswered && resultOverride === null && (
            <span className="text-zinc-600">(suggested from checklist)</span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setResultOverride("pass")}
            className={cn(
              "py-3 rounded-xl font-bold border transition-colors",
              result === "pass"
                ? "bg-emerald-600/25 border-emerald-500/50 text-emerald-400"
                : "bg-white/[0.03] border-white/10 text-zinc-500"
            )}
          >
            PASS
          </button>
          <button
            type="button"
            onClick={() => setResultOverride("fail")}
            className={cn(
              "py-3 rounded-xl font-bold border transition-colors",
              result === "fail"
                ? "bg-red-600/25 border-red-500/50 text-red-400"
                : "bg-white/[0.03] border-white/10 text-zinc-500"
            )}
          >
            FAIL
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        {/* Phase 5 (F2): optional voice notes – typing workflow unchanged */}
        {featureFlags.voiceNotes && (
          <div className="flex justify-end mb-1.5">
            <VoiceNoteButton
              onTranscript={(text) =>
                setNotes((prev) => (prev ? `${prev} ${text}` : text))
              }
            />
          </div>
        )}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Technician notes (optional)"
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || isPending}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CheckCircle2 className="w-4 h-4" />
        )}
        {allAnswered
          ? `Submit Inspection – ${result.toUpperCase()}`
          : "Answer all items to submit"}
      </button>
    </div>
  );
}

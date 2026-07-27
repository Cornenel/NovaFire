"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { runOrQueue } from "@/lib/offline/outbox";
import { getLocalUserId } from "@/lib/offline/operations";
import { buildApplicabilityContext } from "@/lib/checklists/applicability";
import { getAllSectionsForAsset } from "@/lib/checklists/definitions";
import { buildLegacyInspectionChecklist } from "@/lib/checklists/legacy-bridge";
import {
  mapOverallResultToInspectionFlags,
  suggestDefectFromFailedCheck,
} from "@/lib/checklists/outcome-mapper";
import {
  countChecklistProgress,
  deriveSuggestedOverallResult,
  mapOverallResultToInspectionResult,
  validateChecklistCompletion,
  validateChecklistDraft,
} from "@/lib/checklists/validation";
import { CHECKLIST_VERSION } from "@/lib/checklists/version";
import {
  CHECKLIST_STATUS_LABELS,
  OVERALL_RESULT_LABELS,
  type CheckAnswerResult,
  type OverallEquipmentResult,
  type StoredCheckAnswer,
} from "@/lib/checklists/types";
import { addMonths, todayInSA } from "@/lib/fsm/dates";
import type { Asset } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";
import { PhotoUpload } from "./photo-upload";

const RESULT_BUTTONS: Array<{ value: CheckAnswerResult; label: string; cls: string }> = [
  { value: "pass", label: "Pass", cls: "bg-emerald-600/25 border-emerald-500/50 text-emerald-400" },
  { value: "fail", label: "Fail", cls: "bg-red-600/25 border-red-500/50 text-red-400" },
  { value: "not_applicable", label: "N/A", cls: "bg-white/10 border-white/20 text-zinc-300" },
];

export function AssetInspectionChecklist({
  jobId,
  asset,
  initialAnswers = [],
  initialChecklistId,
  initialOverallResult,
}: {
  jobId: string;
  asset: Asset;
  initialAnswers?: StoredCheckAnswer[];
  initialChecklistId?: string;
  initialOverallResult?: OverallEquipmentResult | null;
}) {
  const router = useRouter();
  const ctx = useMemo(() => buildApplicabilityContext(asset), [asset]);
  const sections = useMemo(
    () => getAllSectionsForAsset(asset.asset_type, ctx.hasCabinet === true),
    [asset.asset_type, ctx.hasCabinet]
  );

  const [checklistId] = useState(() => initialChecklistId ?? crypto.randomUUID());
  const [inspectionId] = useState(() => crypto.randomUUID());
  const [answers, setAnswers] = useState<StoredCheckAnswer[]>(initialAnswers);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [overallResult, setOverallResult] = useState<OverallEquipmentResult | null>(
    initialOverallResult ?? null
  );
  const [notes, setNotes] = useState("");
  const [finalConditionConfirmed, setFinalConditionConfirmed] = useState(false);
  const [customerInformed, setCustomerInformed] = useState(false);
  const [hasCabinet, setHasCabinet] = useState<boolean | undefined>(ctx.hasCabinet);
  const [error, setError] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [wasQueued, setWasQueued] = useState(false);

  const ctxWithCabinet = useMemo(
    () => ({ ...ctx, hasCabinet }),
    [ctx, hasCabinet]
  );
  const progress = useMemo(
    () => countChecklistProgress(sections, ctxWithCabinet, answers),
    [sections, ctxWithCabinet, answers]
  );
  const currentSection = sections[sectionIndex];

  const getAnswer = useCallback(
    (sectionKey: string, checkKey: string) =>
      answers.find((a) => a.sectionKey === sectionKey && a.checkKey === checkKey),
    [answers]
  );

  function setAnswer(
    sectionKey: string,
    checkKey: string,
    label: string,
    patch: Partial<StoredCheckAnswer>
  ) {
    setAnswers((prev) => {
      const idx = prev.findIndex(
        (a) => a.sectionKey === sectionKey && a.checkKey === checkKey
      );
      const base: StoredCheckAnswer = {
        sectionKey,
        checkKey,
        label,
        result: "not_inspected",
        ...(idx >= 0 ? prev[idx] : {}),
        ...patch,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = base;
        return next;
      }
      return [...prev, base];
    });
  }

  async function saveDraft() {
    setError("");
    setBusy(true);
    const technicianId = await getLocalUserId();
    if (!technicianId) {
      setError("Session expired – please sign in again.");
      setBusy(false);
      return;
    }

    const res = await runOrQueue({
      type: "checklist_draft",
      payload: {
        checklistId,
        jobId,
        assetId: asset.id,
        assetType: asset.asset_type,
        technicianId,
        answers,
        overallResult,
        notes: notes || null,
        finalConditionConfirmed,
        customerInformed,
      },
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSaveNote(
      res.queued
        ? "Draft saved on this device – will sync when signal returns."
        : "Draft saved."
    );
  }

  async function completeInspection() {
    setError("");
    setBusy(true);
    const technicianId = await getLocalUserId();
    if (!technicianId) {
      setError("Session expired – please sign in again.");
      setBusy(false);
      return;
    }

    const suggested = overallResult ?? deriveSuggestedOverallResult(answers);
    const legacyChecklist = buildLegacyInspectionChecklist(asset.asset_type, answers);
    const inspectionResult = mapOverallResultToInspectionResult(suggested, answers);
    const flags = mapOverallResultToInspectionFlags(suggested);
    const today = todayInSA();

    const payload = {
      checklistId,
      jobId,
      assetId: asset.id,
      assetType: asset.asset_type,
      technicianId,
      answers,
      overallResult: suggested,
      notes: notes || null,
      finalConditionConfirmed,
      customerInformed,
      inspectionId,
      legacyChecklist,
      inspectionResult,
      requiresRefill: flags.requiresRefill,
      requiresPressureTest: flags.requiresPressureTest,
      serviceDate: today,
      nextServiceDate: addMonths(today, 12),
      defects: answers
        .filter((a) => a.result === "fail")
        .map((a) => ({
          id: crypto.randomUUID(),
          ...suggestDefectFromFailedCheck(a),
        })),
    };

    const issues = validateChecklistCompletion(payload, sections, ctxWithCabinet);
    if (issues.length > 0) {
      setError(issues[0].message);
      setBusy(false);
      return;
    }

    const res = await runOrQueue({ type: "checklist_complete", payload });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setWasQueued(res.queued);
    setCompleted(true);
  }

  if (completed) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Detailed inspection complete
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {wasQueued
              ? "Saved on this device – will sync when signal returns."
              : "Checklist and service record saved."}
          </p>
        </div>
        <PhotoUpload jobId={jobId} assetId={asset.id} inspectionId={inspectionId} />
        <button
          type="button"
          onClick={() => {
            router.push(`/tech/assets/${asset.id}?job=${jobId}`);
            router.refresh();
          }}
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
        <div className="flex justify-between text-xs text-zinc-400 mb-2">
          <span>
            Section {sectionIndex + 1} of {sections.length}
          </span>
          <span>{progress.percent}% · v{CHECKLIST_VERSION}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <h2 className="text-base font-semibold text-white">{currentSection.title}</h2>
        {currentSection.description ? (
          <p className="text-xs text-zinc-500 mt-1">{currentSection.description}</p>
        ) : null}
      </div>

      {sectionIndex === 0 && asset.asset_type === "fire_extinguisher" ? (
        <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-4">
          <p className="text-sm text-zinc-300 mb-2">Is a cabinet fitted?</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: true, l: "Yes" },
              { v: false, l: "No" },
              { v: undefined, l: "Unknown" },
            ].map(({ v, l }) => (
              <button
                key={l}
                type="button"
                onClick={() => setHasCabinet(v)}
                className={cn(
                  "py-2 rounded-lg text-xs font-semibold border",
                  hasCabinet === v
                    ? "bg-red-600/25 border-red-500/50 text-red-300"
                    : "bg-white/[0.03] border-white/10 text-zinc-500"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
        {currentSection.checks
          .filter((check) => !check.applicable || check.applicable(ctxWithCabinet))
          .map((check) => {
            const answer = getAnswer(currentSection.key, check.key);
            return (
              <div key={check.key} className="px-4 py-3 space-y-2">
                <p className="text-sm text-zinc-200">{check.label}</p>
                {check.answerType === "numeric" ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={check.unit ? `Reading (${check.unit})` : "Reading"}
                    value={answer?.valueNumber ?? ""}
                    onChange={(e) =>
                      setAnswer(currentSection.key, check.key, check.label, {
                        result: e.target.value ? "pass" : "not_inspected",
                        valueNumber: e.target.value ? Number(e.target.value) : null,
                        unit: check.unit ?? null,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#171717] border border-white/10 text-white text-sm"
                  />
                ) : (
                  <div className="flex gap-1">
                    {RESULT_BUTTONS.map((btn) => (
                      <button
                        key={btn.value}
                        type="button"
                        onClick={() =>
                          setAnswer(currentSection.key, check.key, check.label, {
                            result: btn.value,
                            defectSeverity:
                              btn.value === "fail" && check.criticalOnFail
                                ? "critical"
                                : btn.value === "fail"
                                  ? "high"
                                  : null,
                            requiresAction: btn.value === "fail",
                          })
                        }
                        className={cn(
                          "flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors",
                          answer?.result === btn.value
                            ? btn.cls
                            : "bg-white/[0.03] border-white/10 text-zinc-500"
                        )}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
                {answer?.result === "fail" || answer?.result === "not_applicable" ? (
                  <textarea
                    value={answer?.notes ?? ""}
                    onChange={(e) =>
                      setAnswer(currentSection.key, check.key, check.label, {
                        notes: e.target.value,
                      })
                    }
                    placeholder={
                      answer?.result === "fail"
                        ? "Defect / action note (required)"
                        : "Reason for N/A (if required)"
                    }
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-[#171717] border border-white/10 text-white text-sm"
                  />
                ) : null}
              </div>
            );
          })}
      </div>

      {sectionIndex === sections.length - 1 ? (
        <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Overall result</p>
          <select
            value={overallResult ?? ""}
            onChange={(e) =>
              setOverallResult((e.target.value as OverallEquipmentResult) || null)
            }
            className="w-full px-3 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white text-sm"
          >
            <option value="">Select result</option>
            {Object.entries(OVERALL_RESULT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={finalConditionConfirmed}
              onChange={(e) => setFinalConditionConfirmed(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            Asset final condition confirmed after service
          </label>
          {answers.some((a) => a.defectSeverity === "critical") ? (
            <label className="flex items-center gap-2 text-sm text-amber-300">
              <input
                type="checkbox"
                checked={customerInformed}
                onChange={(e) => setCustomerInformed(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              Customer informed of critical findings
            </label>
          ) : null}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Inspection notes (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-[#171717] border border-white/10 text-white text-sm"
          />
          <div className="text-xs text-zinc-500 grid grid-cols-2 gap-2">
            <span>Answered: {progress.answered}</span>
            <span>Failed: {progress.failed}</span>
            <span>N/A: {progress.na}</span>
            <span>Outstanding: {progress.outstanding}</span>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {saveNote ? <p className="text-xs text-zinc-500">{saveNote}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={sectionIndex === 0 || busy}
          onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}
          className="flex items-center justify-center gap-1 py-3 rounded-xl border border-white/10 text-zinc-300 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        {sectionIndex < sections.length - 1 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setSectionIndex((i) => Math.min(sections.length - 1, i + 1))}
            className="flex items-center justify-center gap-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={completeInspection}
            className="flex items-center justify-center gap-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Complete
          </button>
        )}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={saveDraft}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-zinc-300"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save draft
      </button>

      <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
        {CHECKLIST_STATUS_LABELS.in_progress} · Designed to support the technician&apos;s
        inspection process and company compliance controls.
      </p>
    </div>
  );
}

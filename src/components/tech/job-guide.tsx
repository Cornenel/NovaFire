"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { JobWorkflow } from "@/components/tech/job-workflow";
import { TechAssetCreateForm } from "@/components/tech/tech-asset-create-form";
import {
  buildJobGuideSteps,
  canOpenSignOff,
  currentGuideStep,
  guideProgress,
  type JobGuideStep,
} from "@/lib/fsm/job-guide";
import type { Asset, JobStatus } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

function StepIcon({ status }: { status: JobGuideStep["status"] }) {
  if (status === "complete") {
    return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  return (
    <Circle
      className={cn(
        "w-4 h-4 shrink-0",
        status === "current" ? "text-red-400" : "text-zinc-600"
      )}
    />
  );
}

export function JobGuide({
  jobId,
  siteId,
  status,
  assets,
  inspectedAssetIds,
  includeFireRisk,
  assetAddedCode,
}: {
  jobId: string;
  siteId: string;
  status: JobStatus;
  assets: Asset[];
  inspectedAssetIds: Set<string>;
  includeFireRisk: boolean;
  assetAddedCode?: string | null;
}) {
  const steps = buildJobGuideSteps({
    job: { id: jobId, status },
    assets,
    inspectedAssetIds,
    includeFireRisk,
  });
  const current = currentGuideStep(steps);
  const progress = guideProgress(steps);
  const inspectedCount = assets.filter((asset) => inspectedAssetIds.has(asset.id)).length;
  const showAssetForm = status === "on_site" || status === "awaiting_parts";
  const signOffReady = canOpenSignOff({
    status,
    assetCount: assets.length,
    inspectedCount,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-red-300/80">
              Job guide
            </p>
            <h2 className="text-base font-semibold text-white font-[family-name:var(--font-syne)]">
              {current?.title ?? "Jobcard complete"}
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {progress.complete}/{progress.total}
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-300"
            style={{
              width: `${progress.total === 0 ? 0 : (progress.complete / progress.total) * 100}%`,
            }}
          />
        </div>

        {current ? (
          <p className="text-sm text-zinc-300 leading-relaxed">{current.description}</p>
        ) : (
          <p className="text-sm text-emerald-300">All required steps are done.</p>
        )}

        {current?.hint ? (
          <p className="text-xs text-amber-400/90 mt-2">{current.hint}</p>
        ) : null}

        {assetAddedCode ? (
          <p className="text-xs text-emerald-400 mt-2">
            Added {assetAddedCode}. Inspect it next, then continue the guide.
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          <JobWorkflow jobId={jobId} status={status} guided />

          {current?.href ? (
            <Link
              href={current.href}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
            >
              {current.id === "inspect" ? "Open next inspection" : "Continue"}
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : null}

          {signOffReady ? (
            <Link
              href={`/tech/jobs/${jobId}/complete`}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Sign off & complete
            </Link>
          ) : null}
        </div>
      </div>

      {showAssetForm ? (
        <TechAssetCreateForm
          jobId={jobId}
          siteId={siteId}
          defaultOpen={assets.length === 0 || current?.id === "register"}
        />
      ) : null}

      <details className="rounded-xl border border-white/[0.08] nf-glass-panel">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-300">
          View all steps
        </summary>
        <ol className="border-t border-white/5 divide-y divide-white/5">
          {steps.map((step) => (
            <li key={step.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <StepIcon status={step.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm",
                        step.status === "complete"
                          ? "text-zinc-400"
                          : step.status === "current"
                            ? "text-white font-medium"
                            : "text-zinc-300"
                      )}
                    >
                      {step.title}
                      {step.status === "optional" ? (
                        <span className="ml-2 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                          Optional
                        </span>
                      ) : null}
                    </p>
                    {step.href && step.status !== "complete" ? (
                      <Link href={step.href} className="text-xs text-red-400 shrink-0">
                        Open
                      </Link>
                    ) : null}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

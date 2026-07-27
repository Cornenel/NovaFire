import type { Asset, JobStatus, JobWithRelations } from "@/lib/fsm/types";

export type GuideStepStatus = "complete" | "current" | "upcoming" | "optional";

export type JobGuideStep = {
  id: string;
  title: string;
  description: string;
  status: GuideStepStatus;
  href?: string;
  hint?: string;
};

export function buildJobGuideSteps({
  job,
  assets,
  inspectedAssetIds,
  includeFireRisk,
}: {
  job: Pick<JobWithRelations, "id" | "status">;
  assets: Asset[];
  inspectedAssetIds: Set<string>;
  includeFireRisk: boolean;
}): JobGuideStep[] {
  const status = job.status;
  const totalAssets = assets.length;
  const inspectedCount = assets.filter((asset) => inspectedAssetIds.has(asset.id)).length;
  const allInspected = totalAssets > 0 && inspectedCount === totalAssets;
  const onSite = status === "on_site";
  const checkedIn = onSite || status === "completed" || status === "awaiting_parts";
  const travelling = status === "travelling" || checkedIn;
  const completed = status === "completed";

  const steps: JobGuideStep[] = [
    {
      id: "travel",
      title: "Start travel",
      description: "Tap when you leave for the customer site.",
      status: completed
        ? "complete"
        : travelling
          ? "complete"
          : status === "not_started"
            ? "current"
            : "upcoming",
    },
    {
      id: "checkin",
      title: "Check in on site",
      description: "Confirm arrival and capture GPS when you reach the site.",
      status: completed
        ? "complete"
        : checkedIn
          ? "complete"
          : travelling
            ? "current"
            : "upcoming",
    },
    {
      id: "register",
      title: "Register equipment found",
      description:
        totalAssets === 0
          ? "No assets on file yet. Add each extinguisher, reel, or other item you find on site."
          : "Found equipment not on the register? Add it here before you inspect.",
      status: completed
        ? "complete"
        : onSite
          ? totalAssets === 0
            ? "current"
            : "optional"
          : checkedIn
            ? "optional"
            : "upcoming",
      hint: totalAssets === 0 ? "Add at least one asset to continue." : undefined,
    },
    {
      id: "inspect",
      title: "Inspect every asset",
      description:
        totalAssets === 0
          ? "Add equipment first, then inspect each item on the register."
          : `${inspectedCount} of ${totalAssets} inspected. Open each asset and complete its checklist.`,
      status: completed
        ? "complete"
        : onSite && totalAssets > 0
          ? allInspected
            ? "complete"
            : "current"
          : onSite && totalAssets === 0
            ? "upcoming"
            : checkedIn
              ? "upcoming"
              : "upcoming",
      href:
        onSite && totalAssets > 0 && !allInspected
          ? `/tech/assets/${assets.find((asset) => !inspectedAssetIds.has(asset.id))?.id}?job=${job.id}`
          : undefined,
      hint:
        onSite && totalAssets > 0 && !allInspected
          ? "Tap the next asset below or use Open next inspection."
          : undefined,
    },
    {
      id: "stock",
      title: "Record stock used",
      description: "Optional — log parts or extinguishers used from your van.",
      status: completed ? "complete" : onSite ? "optional" : "upcoming",
      href: onSite ? `/tech/jobs/${job.id}/stock` : undefined,
    },
  ];

  if (includeFireRisk) {
    steps.push({
      id: "risk",
      title: "Log fire risks",
      description: "Optional — record any fire hazards noticed during the visit.",
      status: completed ? "complete" : onSite ? "optional" : "upcoming",
      href: onSite ? `/tech/jobs/${job.id}/risk` : undefined,
    });
  }

  steps.push({
    id: "signoff",
    title: "Sign off & complete",
    description: "Review the work summary and collect the customer signature.",
    status: completed
      ? "complete"
      : onSite && (totalAssets === 0 ? false : allInspected)
        ? "current"
        : onSite && totalAssets === 0
          ? "upcoming"
          : "upcoming",
    href:
      onSite && totalAssets > 0 && allInspected
        ? `/tech/jobs/${job.id}/complete`
        : undefined,
    hint:
      onSite && totalAssets > 0 && !allInspected
        ? "Finish all inspections before sign-off."
        : onSite && totalAssets === 0
          ? "Register and inspect equipment first."
          : undefined,
  });

  return steps;
}

export function currentGuideStep(steps: JobGuideStep[]): JobGuideStep | null {
  return steps.find((step) => step.status === "current") ?? null;
}

export function guideProgress(steps: JobGuideStep[]): {
  complete: number;
  total: number;
} {
  const actionable = steps.filter((step) => step.status !== "optional");
  const complete = actionable.filter((step) => step.status === "complete").length;
  return { complete, total: actionable.length };
}

export function canOpenSignOff({
  status,
  assetCount,
  inspectedCount,
}: {
  status: JobStatus;
  assetCount: number;
  inspectedCount: number;
}): boolean {
  return (
    status === "on_site" &&
    assetCount > 0 &&
    inspectedCount === assetCount
  );
}

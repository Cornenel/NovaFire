import type { Asset, AssetType } from "@/lib/fsm/types";
import type {
  ApplicabilityContext,
  CheckDefinition,
  ChecklistSectionDefinition,
} from "./types";

export function buildApplicabilityContext(asset: Asset): ApplicabilityContext {
  const medium = (asset.asset_medium ?? "").toLowerCase();
  const isCo2 = medium.includes("co2") || asset.asset_type === "co2_unit";
  const isPowder =
    medium.includes("dcp") ||
    medium.includes("powder") ||
    medium.includes("abc") ||
    asset.asset_type === "dcp_unit";
  const isFoam = medium.includes("foam");
  const isWater = medium.includes("water") && !medium.includes("wet");
  const isWetChemical =
    medium.includes("wet") || medium.includes("k class") || medium.includes("f class");

  return {
    assetType: asset.asset_type,
    assetMedium: asset.asset_medium ?? null,
    sizeCapacity: asset.size_capacity,
    isCo2,
    isStoredPressure: !isCo2,
    isPowder,
    isFoam,
    isWater,
    isWetChemical,
    hasHose: !isCo2,
    hasCabinet: undefined,
  };
}

export function isCheckApplicable(
  check: CheckDefinition,
  ctx: ApplicabilityContext
): boolean {
  if (check.applicable) return check.applicable(ctx);
  return true;
}

export function getApplicableChecks(
  sections: ChecklistSectionDefinition[],
  ctx: ApplicabilityContext
): Array<CheckDefinition & { sectionKey: string; sectionTitle: string }> {
  const out: Array<CheckDefinition & { sectionKey: string; sectionTitle: string }> = [];
  for (const section of sections) {
    for (const check of section.checks) {
      if (isCheckApplicable(check, ctx)) {
        out.push({
          ...check,
          sectionKey: section.key,
          sectionTitle: section.title,
        });
      }
    }
  }
  return out;
}

export function assetTypeRequiresDetailedChecklist(
  assetType: AssetType,
  configuredTypes?: string[] | null
): boolean {
  const types =
    configuredTypes ??
    (["fire_extinguisher", "hose_reel", "hydrant", "signage"] as string[]);
  return types.includes(assetType);
}

export function mediumFlags(medium: string | null | undefined) {
  const m = (medium ?? "").toLowerCase();
  return {
    isCo2: m.includes("co2"),
    isPowder: m.includes("dcp") || m.includes("powder") || m.includes("abc"),
    isFoam: m.includes("foam"),
    isWater: m.includes("water") && !m.includes("wet"),
    isWetChemical: m.includes("wet") || m.includes("k class"),
  };
}

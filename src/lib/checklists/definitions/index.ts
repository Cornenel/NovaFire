import type { AssetType } from "@/lib/fsm/types";
import type { ChecklistSectionDefinition } from "../types";
import { EXTINGUISHER_SECTIONS } from "./extinguisher";
import { HOSE_REEL_SECTIONS } from "./hose-reel";
import { HYDRANT_SECTIONS, CABINET_SECTIONS, SIGNAGE_SECTIONS } from "./hydrant";
import { GENERAL_CHECKLIST } from "@/lib/fsm/checklists";
import { pfChecks } from "./helpers";

const GENERAL_SECTIONS: ChecklistSectionDefinition[] = [
  {
    key: "general",
    title: "General inspection",
    checks: pfChecks(
      GENERAL_CHECKLIST.map((item) => [item.id, item.label] as [string, string])
    ),
  },
];

export function getDetailedSectionsForAssetType(
  assetType: AssetType
): ChecklistSectionDefinition[] {
  switch (assetType) {
    case "fire_extinguisher":
    case "co2_unit":
    case "dcp_unit":
      return EXTINGUISHER_SECTIONS;
    case "hose_reel":
      return HOSE_REEL_SECTIONS;
    case "hydrant":
      return HYDRANT_SECTIONS;
    case "signage":
      return SIGNAGE_SECTIONS;
    default:
      return GENERAL_SECTIONS;
  }
}

export function getAllSectionsForAsset(
  assetType: AssetType,
  includeCabinet: boolean
): ChecklistSectionDefinition[] {
  const sections = [...getDetailedSectionsForAssetType(assetType)];
  if (includeCabinet && assetType === "fire_extinguisher") {
    sections.splice(1, 0, ...CABINET_SECTIONS);
  }
  return sections;
}

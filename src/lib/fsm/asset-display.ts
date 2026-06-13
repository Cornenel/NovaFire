import { ASSET_TYPE_LABELS } from "./labels";
import type { AssetType } from "./types";

export interface AssetDisplayInput {
  asset_type: AssetType;
  size_capacity?: string | null;
  asset_medium?: string | null;
  legacy_description?: string | null;
}

/** Display normalized extinguisher attributes without exposing legacy pseudo-types. */
export function formatAssetDisplayName(asset: AssetDisplayInput): string {
  const typeLabel = ASSET_TYPE_LABELS[asset.asset_type];

  if (
    asset.asset_type === "fire_extinguisher" ||
    asset.asset_type === "dcp_unit" ||
    asset.asset_type === "co2_unit"
  ) {
    const medium =
      asset.asset_medium ??
      (asset.asset_type === "dcp_unit"
        ? "DCP"
        : asset.asset_type === "co2_unit"
          ? "CO2"
          : inferMedium(asset.legacy_description));
    const capacity = asset.size_capacity ?? inferCapacity(asset.legacy_description);
    return [capacity, medium, "Fire Extinguisher"].filter(Boolean).join(" ");
  }

  return asset.size_capacity ? `${typeLabel} · ${asset.size_capacity}` : typeLabel;
}

export function inferMedium(value?: string | null): string | null {
  const text = (value ?? "").toLowerCase();
  if (text.includes("co2")) return "CO2";
  if (text.includes("dcp")) return "DCP";
  if (text.includes("foam")) return "Foam";
  if (text.includes("wet chemical")) return "Wet Chemical";
  if (text.includes("water")) return "Water";
  return null;
}

export function inferCapacity(value?: string | null): string | null {
  return value?.match(/(\d+(?:\.\d+)?)\s*kg/i)?.[0] ?? null;
}

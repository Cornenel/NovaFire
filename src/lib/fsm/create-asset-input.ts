export type AssetFormInput = {
  siteId: string;
  assetType: string;
  assetMedium: string | null;
  sizeCapacity: string | null;
  customerAssetNumber: string | null;
  serialNumber: string | null;
  locationDescription: string | null;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  hydroTestDueDate: string | null;
};

export function parseAssetFormInput(formData: FormData): AssetFormInput {
  return {
    siteId: String(formData.get("site_id") ?? "").trim(),
    assetType: String(formData.get("asset_type") ?? "").trim(),
    assetMedium: strOrNull(formData, "asset_medium"),
    sizeCapacity: strOrNull(formData, "size_capacity"),
    customerAssetNumber: strOrNull(formData, "customer_asset_number"),
    serialNumber: strOrNull(formData, "serial_number"),
    locationDescription: strOrNull(formData, "location_description"),
    lastServiceDate: strOrNull(formData, "last_service_date"),
    nextServiceDate: strOrNull(formData, "next_service_date"),
    hydroTestDueDate: strOrNull(formData, "hydro_test_due_date"),
  };
}

export function validateAssetFormInput(input: AssetFormInput): string | null {
  if (!input.siteId) return "Site is required.";
  if (!input.assetType) return "Select an asset type.";

  if (input.assetType === "fire_extinguisher") {
    if (!input.assetMedium) return "Select extinguisher medium.";
    if (!input.sizeCapacity) return "Select extinguisher capacity.";
    if (!input.locationDescription) return "Enter where the extinguisher is located.";
  }

  return null;
}

function strOrNull(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

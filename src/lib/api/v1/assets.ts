import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isIsoDate, isUuid, pickDefined } from "@/lib/api/v1/validation";

const ASSET_TYPES = [
  "fire_extinguisher",
  "hose_reel",
  "hydrant",
  "fire_blanket",
  "signage",
  "fire_detection",
  "co2_unit",
  "dcp_unit",
] as const;

const ASSET_STATUSES = [
  "compliant",
  "defective",
  "removed",
  "replaced",
  "missing",
] as const;

export const ASSET_SELECT = [
  "id",
  "site_id",
  "asset_code",
  "qr_token",
  "asset_type",
  "asset_medium",
  "size_capacity",
  "customer_asset_number",
  "serial_number",
  "location_description",
  "manufacture_date",
  "last_service_date",
  "next_service_date",
  "last_pressure_test_date",
  "annual_service_due_date",
  "pressure_test_due_date",
  "hydro_test_due_date",
  "status",
  "notes",
  "created_at",
  "updated_at",
].join(",");

const optionalDate = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine((v) => v === undefined || v === null || isIsoDate(v), {
    message: "Dates must use YYYY-MM-DD.",
  });

const assetBodyFields = {
  site_id: z.string().uuid(),
  asset_type: z.enum(ASSET_TYPES),
  asset_medium: z.string().trim().max(64).nullable().optional(),
  size_capacity: z.string().trim().max(64).nullable().optional(),
  customer_asset_number: z.string().trim().max(120).nullable().optional(),
  serial_number: z.string().trim().max(120).nullable().optional(),
  location_description: z.string().trim().max(500).nullable().optional(),
  manufacture_date: optionalDate,
  last_service_date: optionalDate,
  next_service_date: optionalDate,
  last_pressure_test_date: optionalDate,
  annual_service_due_date: optionalDate,
  pressure_test_due_date: optionalDate,
  hydro_test_due_date: optionalDate,
  status: z.enum(ASSET_STATUSES).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
} as const;

export const assetCreateSchema = z.object(assetBodyFields).strict();

export const assetUpdateSchema = z
  .object({
    site_id: assetBodyFields.site_id.optional(),
    asset_type: assetBodyFields.asset_type.optional(),
    asset_medium: assetBodyFields.asset_medium,
    size_capacity: assetBodyFields.size_capacity,
    customer_asset_number: assetBodyFields.customer_asset_number,
    serial_number: assetBodyFields.serial_number,
    location_description: assetBodyFields.location_description,
    manufacture_date: assetBodyFields.manufacture_date,
    last_service_date: assetBodyFields.last_service_date,
    next_service_date: assetBodyFields.next_service_date,
    last_pressure_test_date: assetBodyFields.last_pressure_test_date,
    annual_service_due_date: assetBodyFields.annual_service_due_date,
    pressure_test_due_date: assetBodyFields.pressure_test_due_date,
    hydro_test_due_date: assetBodyFields.hydro_test_due_date,
    status: assetBodyFields.status,
    notes: assetBodyFields.notes,
  })
  .strict();

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;

export async function listAssets(
  supabase: SupabaseClient,
  options: { siteId?: string; customerId?: string; limit: number; offset: number }
) {
  let query = supabase
    .from("assets")
    .select(ASSET_SELECT)
    .order("asset_code")
    .range(options.offset, options.offset + options.limit - 1);

  if (options.siteId) {
    query = query.eq("site_id", options.siteId);
  }

  if (options.customerId) {
    const { data: sites } = await supabase
      .from("sites")
      .select("id")
      .eq("customer_id", options.customerId);
    const siteIds = (sites ?? []).map((s) => s.id as string);
    if (siteIds.length === 0) {
      return {
        data: [] as Record<string, unknown>[],
        error: null,
      };
    }
    query = query.in("site_id", siteIds);
  }

  return query;
}

export async function getAsset(supabase: SupabaseClient, id: string) {
  return supabase.from("assets").select(ASSET_SELECT).eq("id", id).single();
}

export async function createAssetRecord(
  supabase: SupabaseClient,
  raw: unknown
): Promise<
  | { ok: true; asset: Record<string, unknown> }
  | { ok: false; status: number; error: string }
> {
  const parsed = assetCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", parsed.data.site_id)
    .maybeSingle();
  if (!site) {
    return { ok: false, status: 400, error: "Target site_id was not found." };
  }

  if (parsed.data.asset_type === "fire_extinguisher") {
    if (
      !parsed.data.asset_medium ||
      !parsed.data.size_capacity ||
      !parsed.data.location_description
    ) {
      return {
        ok: false,
        status: 400,
        error:
          "Fire extinguishers require asset_medium, size_capacity and location_description.",
      };
    }
  }

  if (parsed.data.customer_asset_number) {
    const { data: dup } = await supabase
      .from("assets")
      .select("id")
      .eq("site_id", parsed.data.site_id)
      .eq("customer_asset_number", parsed.data.customer_asset_number)
      .maybeSingle();
    if (dup) {
      return {
        ok: false,
        status: 409,
        error: `Asset with customer_asset_number already exists on this site (id=${dup.id}). Use PATCH to update.`,
      };
    }
  }

  const insert = {
    ...parsed.data,
    status: parsed.data.status ?? "compliant",
  };

  const { data: createdRaw, error } = await supabase
    .from("assets")
    .insert(insert)
    .select(ASSET_SELECT)
    .single();

  const created = createdRaw as Record<string, unknown> | null;
  if (error || !created) {
    return {
      ok: false,
      status: 500,
      error: error?.message || "Asset could not be created.",
    };
  }

  return { ok: true, asset: created };
}

export async function updateAssetRecord(
  supabase: SupabaseClient,
  id: string,
  raw: AssetUpdateInput
): Promise<
  | { ok: true; asset: Record<string, unknown> }
  | { ok: false; status: number; error: string }
> {
  const parsed = assetUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const patch = pickDefined(parsed.data);
  if (Object.keys(patch).length === 0) {
    return { ok: false, status: 400, error: "No updatable fields provided." };
  }

  if (patch.site_id) {
    if (!isUuid(patch.site_id as string)) {
      return { ok: false, status: 400, error: "site_id must be a UUID." };
    }
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", patch.site_id)
      .maybeSingle();
    if (!site) {
      return { ok: false, status: 400, error: "Target site_id was not found." };
    }
  }

  const nextType = patch.asset_type as string | undefined;
  const nextMedium = patch.asset_medium as string | null | undefined;
  const nextCapacity = patch.size_capacity as string | null | undefined;
  const nextLocation = patch.location_description as string | null | undefined;

  const { data: currentRaw, error: loadError } = await getAsset(supabase, id);
  const current = currentRaw as Record<string, unknown> | null;
  if (loadError || !current) {
    return { ok: false, status: 404, error: "Asset not found." };
  }

  if (nextType === "fire_extinguisher" || current.asset_type === "fire_extinguisher") {
    const medium =
      nextMedium !== undefined
        ? nextMedium
        : ((current.asset_medium as string | null) ?? null);
    const capacity =
      nextCapacity !== undefined
        ? nextCapacity
        : ((current.size_capacity as string | null) ?? null);
    const location =
      nextLocation !== undefined
        ? nextLocation
        : ((current.location_description as string | null) ?? null);
    if (!medium || !capacity || !location) {
      return {
        ok: false,
        status: 400,
        error:
          "Fire extinguishers require asset_medium, size_capacity and location_description.",
      };
    }
  }

  const { data: updatedRaw, error: updateError } = await supabase
    .from("assets")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(ASSET_SELECT)
    .single();

  const updated = updatedRaw as Record<string, unknown> | null;
  if (updateError || !updated) {
    return {
      ok: false,
      status: 500,
      error: updateError?.message || "Asset could not be updated.",
    };
  }

  return { ok: true, asset: updated };
}

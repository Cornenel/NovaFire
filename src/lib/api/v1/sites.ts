import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isValidSouthAfricanPhone,
  isUuid,
  pickDefined,
} from "@/lib/api/v1/validation";

export const SITE_SELECT = [
  "id",
  "customer_id",
  "name",
  "address",
  "latitude",
  "longitude",
  "contact_person",
  "contact_phone",
  "access_notes",
  "created_at",
  "updated_at",
].join(",");

export const siteCreateSchema = z
  .object({
    customer_id: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    address: z.string().trim().min(1).max(2000),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    contact_person: z.string().trim().max(200).nullable().optional(),
    contact_phone: z.string().trim().max(40).nullable().optional(),
    access_notes: z.string().trim().max(5000).nullable().optional(),
  })
  .strict();

export const siteUpdateSchema = siteCreateSchema.partial().strict();

export type SiteCreateInput = z.infer<typeof siteCreateSchema>;
export type SiteUpdateInput = z.infer<typeof siteUpdateSchema>;

export async function listSites(
  supabase: SupabaseClient,
  options: { customerId?: string; limit: number; offset: number }
) {
  let query = supabase
    .from("sites")
    .select(SITE_SELECT)
    .order("name")
    .range(options.offset, options.offset + options.limit - 1);

  if (options.customerId) {
    query = query.eq("customer_id", options.customerId);
  }

  return query;
}

export async function getSite(supabase: SupabaseClient, id: string) {
  return supabase.from("sites").select(SITE_SELECT).eq("id", id).single();
}

export async function createSiteRecord(
  supabase: SupabaseClient,
  raw: unknown
): Promise<
  | { ok: true; site: Record<string, unknown> }
  | { ok: false; status: number; error: string }
> {
  const parsed = siteCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  if (
    typeof parsed.data.contact_phone === "string" &&
    parsed.data.contact_phone &&
    !isValidSouthAfricanPhone(parsed.data.contact_phone)
  ) {
    return {
      ok: false,
      status: 400,
      error: "Enter a valid South African phone number.",
    };
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", parsed.data.customer_id)
    .maybeSingle();
  if (!customer) {
    return { ok: false, status: 400, error: "Target customer_id was not found." };
  }

  const { data: existing } = await supabase
    .from("sites")
    .select("id, name, address")
    .eq("customer_id", parsed.data.customer_id)
    .ilike("name", parsed.data.name);

  const exact = (existing ?? []).find(
    (s) =>
      String(s.name).trim().toLowerCase() === parsed.data.name.trim().toLowerCase() &&
      String(s.address).trim().toLowerCase() ===
        parsed.data.address.trim().toLowerCase()
  );
  if (exact) {
    return {
      ok: false,
      status: 409,
      error: `Site already exists for this customer (id=${exact.id}). Use PATCH to update.`,
    };
  }

  const { data: createdRaw, error } = await supabase
    .from("sites")
    .insert(parsed.data)
    .select(SITE_SELECT)
    .single();

  const created = createdRaw as Record<string, unknown> | null;
  if (error || !created) {
    return {
      ok: false,
      status: 500,
      error: error?.message || "Site could not be created.",
    };
  }

  return { ok: true, site: created };
}

export async function updateSiteRecord(
  supabase: SupabaseClient,
  id: string,
  raw: SiteUpdateInput
): Promise<
  | { ok: true; site: Record<string, unknown> }
  | { ok: false; status: number; error: string }
> {
  const parsed = siteUpdateSchema.safeParse(raw);
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

  if (
    typeof patch.contact_phone === "string" &&
    patch.contact_phone &&
    !isValidSouthAfricanPhone(patch.contact_phone)
  ) {
    return {
      ok: false,
      status: 400,
      error: "Enter a valid South African phone number.",
    };
  }

  if (patch.customer_id) {
    if (!isUuid(patch.customer_id as string)) {
      return { ok: false, status: 400, error: "customer_id must be a UUID." };
    }
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", patch.customer_id)
      .maybeSingle();
    if (!customer) {
      return { ok: false, status: 400, error: "Target customer_id was not found." };
    }
  }

  const { data: current, error: loadError } = await getSite(supabase, id);
  if (loadError || !current) {
    return { ok: false, status: 404, error: "Site not found." };
  }

  const { data: updatedRaw, error: updateError } = await supabase
    .from("sites")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SITE_SELECT)
    .single();

  const updated = updatedRaw as Record<string, unknown> | null;
  if (updateError || !updated) {
    return {
      ok: false,
      status: 500,
      error: updateError?.message || "Site could not be updated.",
    };
  }

  return { ok: true, site: updated };
}

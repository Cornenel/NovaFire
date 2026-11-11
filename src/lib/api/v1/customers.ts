import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isValidEmail,
  isValidSouthAfricanPhone,
  normalizePhoneForMatch,
  normalizeTextForMatch,
  pickDefined,
} from "@/lib/api/v1/validation";

export const CUSTOMER_SELECT = [
  "id",
  "name",
  "trading_name",
  "contact_person",
  "phone",
  "email",
  "vat_number",
  "registration_number",
  "billing_address",
  "physical_address",
  "notes",
  "status",
  "is_sla_client",
  "created_at",
  "updated_at",
].join(",");

export const customerUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    trading_name: z.string().trim().max(200).nullable().optional(),
    contact_person: z.string().trim().max(200).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    email: z.string().trim().max(320).nullable().optional(),
    vat_number: z.string().trim().max(64).nullable().optional(),
    registration_number: z.string().trim().max(64).nullable().optional(),
    billing_address: z.string().trim().max(2000).nullable().optional(),
    physical_address: z.string().trim().max(2000).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    is_sla_client: z.boolean().optional(),
    confirm_duplicates: z.boolean().optional(),
  })
  .strict();

export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export async function listCustomers(
  supabase: SupabaseClient,
  options: { q?: string; limit: number; offset: number }
) {
  let query = supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .order("name")
    .range(options.offset, options.offset + options.limit - 1);

  if (options.q) {
    const safe = options.q.replace(/[%_,]/g, " ").trim();
    if (safe) {
      const q = `%${safe}%`;
      query = query.or(
        `name.ilike.${q},trading_name.ilike.${q},email.ilike.${q},phone.ilike.${q}`
      );
    }
  }

  return query;
}

export async function getCustomer(supabase: SupabaseClient, id: string) {
  return supabase.from("customers").select(CUSTOMER_SELECT).eq("id", id).single();
}

export async function updateCustomerRecord(
  supabase: SupabaseClient,
  id: string,
  raw: CustomerUpdateInput
): Promise<
  | { ok: true; customer: Record<string, unknown> }
  | {
      ok: false;
      status: number;
      error: string;
      duplicates?: Array<Record<string, unknown>>;
    }
> {
  const parsed = customerUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const patch = pickDefined({ ...parsed.data, confirm_duplicates: undefined });
  if (Object.keys(patch).length === 0) {
    return { ok: false, status: 400, error: "No updatable fields provided." };
  }

  if (typeof patch.email === "string" && patch.email && !isValidEmail(patch.email)) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }
  if (
    typeof patch.phone === "string" &&
    patch.phone &&
    !isValidSouthAfricanPhone(patch.phone)
  ) {
    return {
      ok: false,
      status: 400,
      error: "Enter a valid South African phone number.",
    };
  }

  const { data: currentRaw, error: loadError } = await getCustomer(supabase, id);
  const current = currentRaw as Record<string, unknown> | null;
  if (loadError || !current) {
    return { ok: false, status: 404, error: "Customer not found." };
  }

  const nextName = (patch.name as string | undefined) ?? String(current.name ?? "");
  const nextEmail =
    patch.email !== undefined
      ? (patch.email as string | null)
      : ((current.email as string | null) ?? null);
  const nextPhone =
    patch.phone !== undefined
      ? (patch.phone as string | null)
      : ((current.phone as string | null) ?? null);

  const { data: otherCustomers } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .neq("id", id);

  const normalizedName = normalizeTextForMatch(nextName);
  const normalizedEmail = normalizeTextForMatch(nextEmail);
  const normalizedPhone = normalizePhoneForMatch(nextPhone);

  const duplicates = (otherCustomers ?? [])
    .map((candidate) => {
      const reasons: string[] = [];
      if (
        normalizedName &&
        normalizeTextForMatch(candidate.name) === normalizedName
      ) {
        reasons.push("name");
      }
      if (
        normalizedEmail &&
        normalizeTextForMatch(candidate.email) === normalizedEmail
      ) {
        reasons.push("email");
      }
      if (
        normalizedPhone &&
        normalizePhoneForMatch(candidate.phone) === normalizedPhone
      ) {
        reasons.push("phone");
      }
      return { ...candidate, reasons };
    })
    .filter((c) => c.reasons.length > 0);

  if (duplicates.length > 0 && parsed.data.confirm_duplicates !== true) {
    return {
      ok: false,
      status: 409,
      error:
        "Possible duplicate customer detected. Resubmit with confirm_duplicates=true to proceed.",
      duplicates,
    };
  }

  const { data: updatedRaw, error: updateError } = await supabase
    .from("customers")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(CUSTOMER_SELECT)
    .single();

  const updated = updatedRaw as Record<string, unknown> | null;
  if (updateError || !updated) {
    return {
      ok: false,
      status: 500,
      error: updateError?.message || "Customer could not be updated.",
    };
  }

  return { ok: true, customer: updated };
}

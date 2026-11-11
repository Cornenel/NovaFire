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

const customerFields = {
  name: z.string().trim().min(1).max(200),
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
} as const;

export const customerCreateSchema = z
  .object({
    ...customerFields,
    name: customerFields.name,
  })
  .strict();

export const customerUpdateSchema = z
  .object({
    name: customerFields.name.optional(),
    trading_name: customerFields.trading_name,
    contact_person: customerFields.contact_person,
    phone: customerFields.phone,
    email: customerFields.email,
    vat_number: customerFields.vat_number,
    registration_number: customerFields.registration_number,
    billing_address: customerFields.billing_address,
    physical_address: customerFields.physical_address,
    notes: customerFields.notes,
    status: customerFields.status,
    is_sla_client: customerFields.is_sla_client,
    confirm_duplicates: customerFields.confirm_duplicates,
  })
  .strict();

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

async function findCustomerDuplicates(
  supabase: SupabaseClient,
  values: { name: string; email?: string | null; phone?: string | null },
  excludeId?: string
) {
  let query = supabase.from("customers").select("id, name, email, phone");
  if (excludeId) query = query.neq("id", excludeId);
  const { data: otherCustomers } = await query;

  const normalizedName = normalizeTextForMatch(values.name);
  const normalizedEmail = normalizeTextForMatch(values.email);
  const normalizedPhone = normalizePhoneForMatch(values.phone);

  return (otherCustomers ?? [])
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
}

function validateCustomerContact(values: {
  email?: string | null;
  phone?: string | null;
}): string | null {
  if (typeof values.email === "string" && values.email && !isValidEmail(values.email)) {
    return "Enter a valid email address.";
  }
  if (
    typeof values.phone === "string" &&
    values.phone &&
    !isValidSouthAfricanPhone(values.phone)
  ) {
    return "Enter a valid South African phone number.";
  }
  return null;
}

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

export async function createCustomerRecord(
  supabase: SupabaseClient,
  raw: unknown,
  options?: { createdBy?: string | null }
): Promise<
  | { ok: true; customer: Record<string, unknown> }
  | {
      ok: false;
      status: number;
      error: string;
      duplicates?: Array<Record<string, unknown>>;
    }
> {
  const parsed = customerCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const contactError = validateCustomerContact(parsed.data);
  if (contactError) return { ok: false, status: 400, error: contactError };

  const duplicates = await findCustomerDuplicates(supabase, parsed.data);
  if (duplicates.length > 0 && parsed.data.confirm_duplicates !== true) {
    return {
      ok: false,
      status: 409,
      error:
        "Possible duplicate customer detected. Resubmit with confirm_duplicates=true to proceed.",
      duplicates,
    };
  }

  const { confirm_duplicates: _ignore, ...fields } = parsed.data;
  const insert = {
    ...fields,
    status: fields.status ?? "active",
    is_sla_client: fields.is_sla_client ?? false,
    created_by: options?.createdBy ?? null,
  };

  const { data: createdRaw, error } = await supabase
    .from("customers")
    .insert(insert)
    .select(CUSTOMER_SELECT)
    .single();

  const created = createdRaw as Record<string, unknown> | null;
  if (error || !created) {
    return {
      ok: false,
      status: 500,
      error: error?.message || "Customer could not be created.",
    };
  }

  return { ok: true, customer: created };
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

  const contactError = validateCustomerContact(patch);
  if (contactError) return { ok: false, status: 400, error: contactError };

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

  const duplicates = await findCustomerDuplicates(
    supabase,
    { name: nextName, email: nextEmail, phone: nextPhone },
    id
  );

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

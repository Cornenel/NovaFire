"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireDispatcher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/tech-login");
  return { supabase, user };
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: "Please sign in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active || profile.role !== "admin") {
    return {
      supabase,
      user,
      error: "Only admins can update customer master data.",
    };
  }

  return { supabase, user, error: null };
}

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

// ── Customers ──────────────────────────────────────────────────────────────

export interface CustomerDuplicateCandidate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  reasons: string[];
}

export interface UpdateCustomerState {
  ok: boolean;
  error?: string;
  duplicates?: CustomerDuplicateCandidate[];
}

const editableCustomerFields = [
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
] as const;

type EditableCustomerField = (typeof editableCustomerFields)[number];
type EditableCustomerValues = Record<EditableCustomerField, string | null>;

const initialUpdateCustomerState: UpdateCustomerState = { ok: false };

function normalizeTextForMatch(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhoneForMatch(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0027")) return `0${digits.slice(4)}`;
  if (digits.startsWith("27")) return `0${digits.slice(2)}`;
  return digits;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidSouthAfricanPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!/^(\+?27|0027|0)[0-9\s().-]+$/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, "");
  return (
    (digits.length === 10 && digits.startsWith("0")) ||
    (digits.length === 11 && digits.startsWith("27")) ||
    (digits.length === 13 && digits.startsWith("0027"))
  );
}

export async function createCustomer(formData: FormData) {
  const { supabase, user } = await requireDispatcher();

  const name = str(formData, "name");
  if (!name) return;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name,
      contact_person: strOrNull(formData, "contact_person"),
      email: strOrNull(formData, "email"),
      phone: strOrNull(formData, "phone"),
      billing_address: strOrNull(formData, "billing_address"),
      is_sla_client: formData.get("is_sla_client") === "on",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return;
  redirect(`/admin/customers/${data.id}`);
}

export async function updateCustomer(
  _prevState: UpdateCustomerState = initialUpdateCustomerState,
  formData: FormData
): Promise<UpdateCustomerState> {
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const customerId = str(formData, "customer_id");
  if (!customerId) return { ok: false, error: "Missing customer id." };

  const values: EditableCustomerValues = {
    name: str(formData, "name"),
    trading_name: strOrNull(formData, "trading_name"),
    contact_person: strOrNull(formData, "contact_person"),
    phone: strOrNull(formData, "phone"),
    email: strOrNull(formData, "email"),
    vat_number: strOrNull(formData, "vat_number"),
    registration_number: strOrNull(formData, "registration_number"),
    billing_address: strOrNull(formData, "billing_address"),
    physical_address: strOrNull(formData, "physical_address"),
    notes: strOrNull(formData, "notes"),
    status: str(formData, "status") === "inactive" ? "inactive" : "active",
  };

  if (!values.name) return { ok: false, error: "Customer name is required." };
  if (values.email && !isValidEmail(values.email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (values.phone && !isValidSouthAfricanPhone(values.phone)) {
    return { ok: false, error: "Enter a valid South African phone number." };
  }

  const { data: current, error: loadError } = await supabase
    .from("customers")
    .select(editableCustomerFields.join(","))
    .eq("id", customerId)
    .single();

  if (loadError || !current) {
    return { ok: false, error: "Customer could not be loaded." };
  }

  const { data: otherCustomers } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .neq("id", customerId);

  const normalizedName = normalizeTextForMatch(values.name);
  const normalizedEmail = normalizeTextForMatch(values.email);
  const normalizedPhone = normalizePhoneForMatch(values.phone);

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

      return {
        id: candidate.id as string,
        name: candidate.name as string,
        email: candidate.email as string | null,
        phone: candidate.phone as string | null,
        reasons,
      };
    })
    .filter((candidate) => candidate.reasons.length > 0);

  if (duplicates.length > 0 && formData.get("confirm_duplicates") !== "true") {
    return { ok: false, duplicates };
  }

  const currentValues = current as Partial<EditableCustomerValues>;
  const oldValues = Object.fromEntries(
    editableCustomerFields.map((field) => [field, currentValues[field] ?? null])
  ) as EditableCustomerValues;
  const changedFields = editableCustomerFields.filter(
    (field) => (oldValues[field] ?? null) !== (values[field] ?? null)
  );

  if (changedFields.length === 0) {
    return { ok: true };
  }

  const { error: updateError } = await supabase
    .from("customers")
    .update(values)
    .eq("id", customerId);

  if (updateError) {
    return { ok: false, error: "Customer could not be updated." };
  }

  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/customers");
  return { ok: true };
}

// ── Sites ──────────────────────────────────────────────────────────────────

export async function createSite(formData: FormData) {
  const { supabase } = await requireDispatcher();

  const customerId = str(formData, "customer_id");
  const name = str(formData, "name");
  const address = str(formData, "address");
  if (!customerId || !name || !address) return;

  const lat = strOrNull(formData, "latitude");
  const lng = strOrNull(formData, "longitude");

  await supabase.from("sites").insert({
    customer_id: customerId,
    name,
    address,
    latitude: lat ? parseFloat(lat) : null,
    longitude: lng ? parseFloat(lng) : null,
    contact_person: strOrNull(formData, "contact_person"),
    contact_phone: strOrNull(formData, "contact_phone"),
    access_notes: strOrNull(formData, "access_notes"),
  });

  revalidatePath(`/admin/customers/${customerId}`);
}

// ── Assets ─────────────────────────────────────────────────────────────────

export async function createAsset(formData: FormData) {
  const { supabase, user } = await requireDispatcher();

  const siteId = str(formData, "site_id");
  const assetType = str(formData, "asset_type");
  if (!siteId || !assetType) return;
  const assetMedium = strOrNull(formData, "asset_medium");
  const sizeCapacity = strOrNull(formData, "size_capacity");
  const locationDescription = strOrNull(formData, "location_description");

  // Fire extinguishers must be normalized as one asset type with medium/capacity.
  if (assetType === "fire_extinguisher" && (!assetMedium || !sizeCapacity || !locationDescription)) {
    return;
  }

  const { data } = await supabase
    .from("assets")
    .insert({
      site_id: siteId,
      asset_type: assetType,
      size_capacity: sizeCapacity,
      customer_asset_number: strOrNull(formData, "customer_asset_number"),
      asset_medium: assetMedium,
      serial_number: strOrNull(formData, "serial_number"),
      location_description: locationDescription,
      last_service_date: strOrNull(formData, "last_service_date"),
      next_service_date: strOrNull(formData, "next_service_date"),
      // Phase 5 (additive, optional – nullable column added in migration 00003)
      hydro_test_due_date: strOrNull(formData, "hydro_test_due_date"),
    })
    .select("id")
    .single();

  if (data) {
    await supabase.from("asset_events").insert({
      asset_id: data.id,
      technician_id: user.id,
      event_type: "installed",
      details: {},
    });
  }

  revalidatePath(`/admin/sites/${siteId}`);
}

// ── Jobs ───────────────────────────────────────────────────────────────────

export async function createJob(formData: FormData) {
  const { supabase, user } = await requireDispatcher();

  const customerId = str(formData, "customer_id");
  const siteId = str(formData, "site_id");
  if (!customerId || !siteId) return;

  const assignedTo = strOrNull(formData, "assigned_to");

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      customer_id: customerId,
      site_id: siteId,
      assigned_to: assignedTo,
      created_by: user.id,
      job_type: str(formData, "job_type") || "annual_service",
      priority: str(formData, "priority") || "medium",
      scheduled_date: str(formData, "scheduled_date") || undefined,
      description: strOrNull(formData, "description"),
      contact_person: strOrNull(formData, "contact_person"),
      contact_phone: strOrNull(formData, "contact_phone"),
    })
    .select("id")
    .single();

  if (error || !data) return;
  redirect(`/admin/jobs/${data.id}`);
}

export async function reassignJob(jobId: string, technicianId: string | null) {
  const { supabase } = await requireDispatcher();
  await supabase
    .from("jobs")
    .update({ assigned_to: technicianId })
    .eq("id", jobId);
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath("/admin/jobs");
}

export async function cancelJob(jobId: string) {
  const { supabase } = await requireDispatcher();
  await supabase.from("jobs").update({ status: "cancelled" }).eq("id", jobId);
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath("/admin/jobs");
}

// ── Defects ────────────────────────────────────────────────────────────────

export async function updateDefectStatus(defectId: string, status: string) {
  const { supabase } = await requireDispatcher();
  await supabase.from("defects").update({ status }).eq("id", defectId);
  revalidatePath("/admin/defects");
}

// ── Van stock ──────────────────────────────────────────────────────────────

export async function setVanStock(formData: FormData) {
  const { supabase } = await requireDispatcher();

  const technicianId = str(formData, "technician_id");
  const stockItemId = str(formData, "stock_item_id");
  const quantity = parseInt(str(formData, "quantity"), 10);
  if (!technicianId || !stockItemId || isNaN(quantity) || quantity < 0) return;

  await supabase.from("van_stock").upsert({
    technician_id: technicianId,
    stock_item_id: stockItemId,
    quantity,
  });

  revalidatePath("/admin/stock");
}

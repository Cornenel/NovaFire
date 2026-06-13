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

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

// ── Customers ──────────────────────────────────────────────────────────────

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

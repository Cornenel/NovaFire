"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  importZohoItemsFromCsv,
  importZohoItemsToWarehouse,
} from "@/lib/integrations/zoho/stock-import";

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

function noticePath(notice: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ notice, ...extra });
  return `/admin/stock?${params.toString()}`;
}

function importNotice(
  notice: "imported" | "csv_imported",
  s: {
    fetched: number;
    services: number;
    inventoryItems: number;
    created: number;
    updated: number;
    quantitiesSynced: number;
  }
) {
  return noticePath(notice, {
    fetched: String(s.fetched),
    services: String(s.services),
    inventory: String(s.inventoryItems),
    created: String(s.created),
    updated: String(s.updated),
    synced: String(s.quantitiesSynced),
  });
}

/** Import Zoho Books products + services into the Nova Fire catalogue / warehouse. */
export async function importZohoStockCatalog(formData: FormData) {
  const { supabase, user } = await requireDispatcher();
  const syncQuantities = formData.get("sync_quantities") === "true";

  const result = await importZohoItemsToWarehouse({
    actorId: user.id,
    supabase,
    syncQuantities,
  });

  revalidatePath("/admin/stock");

  if (!result.ok) {
    redirect(noticePath("import_failed", { error: result.error.slice(0, 180) }));
  }

  redirect(importNotice("imported", result.summary));
}

/**
 * Reclassify / upsert from a Zoho Books Items.csv export.
 * Uses Product Type (goods vs service) as the source of truth.
 */
export async function importZohoItemsCsv(formData: FormData) {
  const { user } = await requireDispatcher();
  const file = formData.get("csv_file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(
      noticePath("import_failed", {
        error: "Choose the Zoho Books Items.csv export first.",
      })
    );
  }

  const csvText = await file.text();
  const syncQuantities = formData.get("sync_quantities") === "true";
  const result = await importZohoItemsFromCsv({
    actorId: user.id,
    csvText,
    syncQuantities,
  });

  revalidatePath("/admin/stock");

  if (!result.ok) {
    redirect(noticePath("import_failed", { error: result.error.slice(0, 180) }));
  }

  redirect(importNotice("csv_imported", result.summary));
}

/** Book warehouse stock out to a technician van (decrements warehouse, increments van). */
export async function issueStockToTechnician(formData: FormData) {
  const { supabase, user } = await requireDispatcher();

  const technicianId = str(formData, "technician_id");
  const stockItemId = str(formData, "stock_item_id");
  const quantity = parseInt(str(formData, "quantity"), 10);
  const notes = str(formData, "notes") || null;

  if (!technicianId || !stockItemId || !Number.isFinite(quantity) || quantity <= 0) {
    redirect(noticePath("issue_failed", { error: "Choose a technician, item and quantity." }));
  }

  const { data: item } = await supabase
    .from("stock_items")
    .select("id, category")
    .eq("id", stockItemId)
    .maybeSingle();

  if (!item) {
    redirect(noticePath("issue_failed", { error: "Stock item not found." }));
  }
  if (item.category === "service") {
    redirect(
      noticePath("issue_failed", {
        error: "Services cannot be booked to a van — only inventory stock can.",
      })
    );
  }

  const { error } = await supabase.rpc("issue_warehouse_to_van", {
    p_technician_id: technicianId,
    p_stock_item_id: stockItemId,
    p_quantity: quantity,
    p_actor_id: user.id,
    p_notes: notes,
  });

  revalidatePath("/admin/stock");
  revalidatePath("/tech/stock");

  if (error) {
    redirect(noticePath("issue_failed", { error: error.message.slice(0, 180) }));
  }

  redirect(noticePath("issued"));
}

/** Set warehouse on-hand to an absolute quantity (with audit movement). */
export async function adjustWarehouseOnHand(formData: FormData) {
  const { supabase, user } = await requireDispatcher();

  const stockItemId = str(formData, "stock_item_id");
  const quantity = parseInt(str(formData, "quantity"), 10);
  const notes = str(formData, "notes") || "Manual warehouse adjustment";

  if (!stockItemId || !Number.isFinite(quantity) || quantity < 0) {
    redirect(noticePath("adjust_failed", { error: "Enter a valid on-hand quantity." }));
  }

  const { error } = await supabase.rpc("adjust_warehouse_stock", {
    p_stock_item_id: stockItemId,
    p_new_quantity: quantity,
    p_actor_id: user.id,
    p_notes: notes,
  });

  revalidatePath("/admin/stock");

  if (error) {
    redirect(noticePath("adjust_failed", { error: error.message.slice(0, 180) }));
  }

  redirect(noticePath("adjusted"));
}

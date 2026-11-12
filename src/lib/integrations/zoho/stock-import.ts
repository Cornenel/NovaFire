import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnection } from "./connection";
import { listAllCatalogItems, type ZohoCatalogItem } from "./items";
import { getValidAccessToken } from "./tokens";

export type ZohoStockImportSummary = {
  fetched: number;
  inventoryItems: number;
  services: number;
  created: number;
  updated: number;
  warehouseSeeded: number;
  quantitiesSynced: number;
  skipped: number;
  errors: string[];
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function isActiveStatus(status: string | null): boolean {
  if (!status) return true;
  const value = status.toLowerCase();
  return value === "active" || value === "enabled";
}

function categoryFor(item: ZohoCatalogItem): string {
  if (item.isService) return "service";
  if (item.isInventory) return "inventory";
  const type = (item.itemType ?? "").toLowerCase();
  if (type.includes("purchase")) return "purchase";
  return "general";
}

async function findExistingItem(
  supabase: SupabaseClient,
  organizationId: string,
  item: ZohoCatalogItem
) {
  const { data: byZoho } = await supabase
    .from("stock_items")
    .select("id, name")
    .eq("zoho_organization_id", organizationId)
    .eq("legacy_zoho_item_id", item.itemId)
    .maybeSingle();
  if (byZoho) return byZoho;

  const { data: byName } = await supabase
    .from("stock_items")
    .select("id, name")
    .ilike("name", normalizeName(item.name))
    .limit(1)
    .maybeSingle();
  return byName;
}

/**
 * Upsert Zoho Books products AND services into stock_items.
 * Inventory items also get warehouse_stock rows; services are catalogue-only
 * (warehouse qty stays 0 — they are not bookable van stock).
 * Does not change van_stock or stock_usage.
 */
export async function importZohoItemsToWarehouse(input: {
  actorId: string;
  supabase: SupabaseClient;
  syncQuantities?: boolean;
}): Promise<
  | { ok: true; summary: ZohoStockImportSummary }
  | { ok: false; error: string }
> {
  const connection = await getConnection();
  if (!connection || connection.status !== "connected" || !connection.organization_id) {
    return {
      ok: false,
      error: "Connect Zoho Books and select an organisation before importing stock.",
    };
  }
  if (!connection.last_connection_test_ok) {
    return {
      ok: false,
      error: "Test the Zoho Books connection before importing stock.",
    };
  }

  const token = await getValidAccessToken(connection.id);
  if (!token.ok || !token.organizationId) {
    return {
      ok: false,
      error: token.ok ? "Select a Zoho Books organisation first." : token.error,
    };
  }

  const listed = await listAllCatalogItems({
    apiDomain: token.apiDomain,
    accessToken: token.accessToken,
    organizationId: token.organizationId,
  });
  if (!listed.ok) return { ok: false, error: listed.error };

  const admin = createAdminClient();
  const summary: ZohoStockImportSummary = {
    fetched: listed.items.length,
    inventoryItems: listed.items.filter((item) => item.isInventory).length,
    services: listed.items.filter((item) => item.isService).length,
    created: 0,
    updated: 0,
    warehouseSeeded: 0,
    quantitiesSynced: 0,
    skipped: 0,
    errors: [],
  };

  for (const item of listed.items) {
    try {
      const name = normalizeName(item.name);
      const existing = await findExistingItem(admin, token.organizationId, item);
      const payload = {
        name,
        sku: item.sku,
        unit: item.unit?.trim() || (item.isService ? "service" : "unit"),
        category: categoryFor(item),
        is_active: isActiveStatus(item.status),
        source: "zoho" as const,
        legacy_zoho_item_id: item.itemId,
        zoho_organization_id: token.organizationId,
        updated_at: new Date().toISOString(),
      };

      let stockItemId: string;

      if (existing) {
        const updatePayload =
          existing.name.trim().toLowerCase() === name.toLowerCase()
            ? payload
            : { ...payload, name: existing.name };

        const { data: updated, error } = await admin
          .from("stock_items")
          .update(updatePayload)
          .eq("id", existing.id)
          .select("id")
          .single();
        if (error || !updated) {
          summary.errors.push(`${name}: ${error?.message ?? "update failed"}`);
          summary.skipped += 1;
          continue;
        }
        stockItemId = updated.id as string;
        summary.updated += 1;
      } else {
        const { data: created, error } = await admin
          .from("stock_items")
          .insert(payload)
          .select("id")
          .single();

        if (error || !created) {
          if (error?.code === "23505") {
            const { data: collision } = await admin
              .from("stock_items")
              .select("id")
              .ilike("name", name)
              .maybeSingle();
            if (collision) {
              const { error: linkError } = await admin
                .from("stock_items")
                .update({
                  sku: item.sku,
                  category: categoryFor(item),
                  unit: payload.unit,
                  source: "zoho",
                  legacy_zoho_item_id: item.itemId,
                  zoho_organization_id: token.organizationId,
                  is_active: isActiveStatus(item.status),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", collision.id);
              if (linkError) {
                summary.errors.push(`${name}: ${linkError.message}`);
                summary.skipped += 1;
                continue;
              }
              stockItemId = collision.id as string;
              summary.updated += 1;
            } else {
              summary.errors.push(`${name}: ${error.message}`);
              summary.skipped += 1;
              continue;
            }
          } else {
            summary.errors.push(`${name}: ${error?.message ?? "create failed"}`);
            summary.skipped += 1;
            continue;
          }
        } else {
          stockItemId = created.id as string;
          summary.created += 1;
        }
      }

      // Services stay in the catalogue at warehouse qty 0 (not bookable stock).
      const { data: warehouse } = await admin
        .from("warehouse_stock")
        .select("quantity_on_hand")
        .eq("stock_item_id", stockItemId)
        .maybeSingle();

      if (!warehouse) {
        const initialQty =
          item.isInventory &&
          input.syncQuantities &&
          item.stockOnHand != null &&
          item.stockOnHand >= 0
            ? Math.floor(item.stockOnHand)
            : 0;
        const { error: whError } = await admin.from("warehouse_stock").insert({
          stock_item_id: stockItemId,
          quantity_on_hand: initialQty,
        });
        if (whError) {
          summary.errors.push(`${name}: warehouse ${whError.message}`);
        } else {
          summary.warehouseSeeded += 1;
          if (initialQty > 0) {
            summary.quantitiesSynced += 1;
            await admin.from("stock_movements").insert({
              stock_item_id: stockItemId,
              movement_type: "zoho_import",
              quantity_delta: initialQty,
              quantity_before: 0,
              quantity_after: initialQty,
              actor_id: input.actorId,
              notes: `Imported from Zoho ${item.isService ? "service" : "item"} ${item.itemId}`,
            });
          }
        }
      } else if (
        item.isInventory &&
        input.syncQuantities &&
        item.stockOnHand != null &&
        item.stockOnHand >= 0
      ) {
        const nextQty = Math.floor(item.stockOnHand);
        const before = warehouse.quantity_on_hand as number;
        if (before !== nextQty) {
          const { error: adjError } = await admin.rpc("adjust_warehouse_stock", {
            p_stock_item_id: stockItemId,
            p_new_quantity: nextQty,
            p_actor_id: input.actorId,
            p_notes: `Synced on-hand from Zoho item ${item.itemId}`,
          });
          if (adjError) {
            summary.errors.push(`${name}: qty sync ${adjError.message}`);
          } else {
            summary.quantitiesSynced += 1;
          }
        }
      }
    } catch (error) {
      summary.errors.push(
        `${item.name}: ${error instanceof Error ? error.message : "import failed"}`
      );
      summary.skipped += 1;
    }
  }

  return { ok: true, summary };
}

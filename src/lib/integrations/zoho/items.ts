import { zohoBooksGet } from "./client";
import { FINANCIAL_WRITES_ENABLED } from "./types";

export type ZohoCatalogItem = {
  itemId: string;
  name: string;
  description: string | null;
  sku: string | null;
  status: string | null;
  unit: string | null;
  rate: number | null;
  stockOnHand: number | null;
  itemType: string | null;
  /** True when Zoho tracks inventory for this item. */
  isInventory: boolean;
  /** True when this is a sellable service / non-stock product. */
  isService: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string | null {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function amount(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function classifyItem(item: Record<string, unknown>): {
  itemType: string | null;
  isInventory: boolean;
  isService: boolean;
} {
  const itemType =
    text(item.item_type) ?? text(item.product_type) ?? text(item.item_type_formatted);
  const normalized = (itemType ?? "").toLowerCase().replace(/\s+/g, "_");

  const isInventory =
    normalized === "inventory" ||
    item.track_inventory === true ||
    (typeof item.stock_on_hand === "number" && normalized !== "sales");

  // Zoho Books: sales / sales_and_purchases without inventory tracking ≈ services & non-stock.
  const isService =
    !isInventory &&
    (normalized.includes("service") ||
      normalized === "sales" ||
      normalized === "sales_and_purchases" ||
      normalized === "non_inventory" ||
      normalized === "non-inventory" ||
      normalized === "");

  return { itemType, isInventory, isService };
}

function parseItem(row: unknown): ZohoCatalogItem | null {
  const item = asRecord(row);
  if (!item) return null;
  const itemId = text(item.item_id);
  const name = text(item.name);
  if (!itemId || !name) return null;

  const { itemType, isInventory, isService } = classifyItem(item);
  const stockOnHand = isInventory
    ? amount(item.stock_on_hand) ??
      amount(item.actual_available_stock) ??
      amount(item.available_stock) ??
      amount(item.quantity)
    : null;

  return {
    itemId,
    name,
    description: text(item.description),
    sku: text(item.sku),
    status: text(item.status),
    unit: text(item.unit) ?? text(item.unit_name),
    rate: amount(item.rate),
    stockOnHand,
    itemType,
    isInventory,
    isService,
  };
}

function pageHasMore(body: unknown, received: number): boolean {
  const record = asRecord(body);
  const pageContext = asRecord(record?.page_context);
  return pageContext?.has_more_page === true && received > 0;
}

/**
 * Paginated Zoho Books catalogue: inventory items AND services.
 * Uses Status.All so inactive catalogue rows are included too.
 */
export async function listAllCatalogItems(input: {
  apiDomain: string;
  accessToken: string;
  organizationId: string;
  fetchImpl?: typeof fetch;
  maxPages?: number;
}): Promise<{ ok: true; items: ZohoCatalogItem[] } | { ok: false; error: string }> {
  if (FINANCIAL_WRITES_ENABLED) {
    return { ok: false, error: "Zoho Books financial writes are disabled." };
  }

  const items: ZohoCatalogItem[] = [];
  const maxPages = input.maxPages ?? 50;
  const seen = new Set<string>();

  // Status.All → products + services (active and inactive).
  // No ItemType filter — Inventory-only would drop services.
  for (let page = 1; page <= maxPages; page++) {
    const result = await zohoBooksGet({
      apiDomain: input.apiDomain,
      accessToken: input.accessToken,
      path: "/items",
      query: {
        organization_id: input.organizationId,
        page,
        per_page: 200,
        filter_by: "Status.All",
      },
      fetchImpl: input.fetchImpl,
    });
    if (!result.ok) return { ok: false, error: result.error };

    const record = asRecord(result.body);
    const rows = record && Array.isArray(record.items) ? record.items : [];
    for (const row of rows) {
      const parsed = parseItem(row);
      if (!parsed || seen.has(parsed.itemId)) continue;
      seen.add(parsed.itemId);
      items.push(parsed);
    }

    if (!pageHasMore(result.body, rows.length)) break;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return { ok: true, items };
}

/** @deprecated Prefer listAllCatalogItems — kept for call-site compatibility. */
export async function listAllInventoryItems(
  input: Parameters<typeof listAllCatalogItems>[0]
) {
  return listAllCatalogItems(input);
}

export type ZohoInventoryItem = ZohoCatalogItem;

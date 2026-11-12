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
  /** Zoho item_type: sales | purchases | sales_and_purchases | inventory */
  itemType: string | null;
  /** Zoho product_type: goods | service | digital_service | capital_* (ZA) */
  productType: string | null;
  /** True when this is a sellable physical / inventory stock item. */
  isInventory: boolean;
  /** True when this is a chargeable service you render (not stock). */
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

function normalizeType(value: string | null): string {
  return (value ?? "").toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Classify Zoho Books catalogue rows for Nova Fire.
 *
 * Zoho has two separate axes:
 * - product_type: goods vs service (what you sell / render)
 * - item_type: sales / purchases / sales_and_purchases / inventory (accounting + stock tracking)
 *
 * Stock item  = goods (or inventory-tracked) you can sell / hold
 * Service     = product_type service* — work you render and charge for
 *
 * Never treat item_type "sales" alone as a service (goods are often sales).
 * Never treat stock_on_hand: 0 on a service as inventory.
 */
export function classifyZohoCatalogItem(item: Record<string, unknown>): {
  itemType: string | null;
  productType: string | null;
  isInventory: boolean;
  isService: boolean;
} {
  const itemType = text(item.item_type) ?? text(item.item_type_formatted);
  const productType =
    text(item.product_type) ?? text(item.product_type_formatted);
  const itemNorm = normalizeType(itemType);
  const productNorm = normalizeType(productType);
  const trackInventory =
    item.track_inventory === true ||
    item.track_inventory === "true" ||
    item.track_inventory === 1;

  const productIsService =
    productNorm === "service" ||
    productNorm === "digital_service" ||
    productNorm === "capital_service" ||
    (productNorm.includes("service") && !productNorm.includes("goods"));

  const productIsGoods =
    productNorm === "goods" ||
    productNorm === "capital_goods" ||
    (productNorm.includes("goods") && !productNorm.includes("service"));

  // Services win when Zoho explicitly marks product_type as a service.
  if (productIsService) {
    return {
      itemType,
      productType,
      isInventory: false,
      isService: true,
    };
  }

  // Goods / inventory-tracked items are stock — even when item_type is "sales".
  if (
    productIsGoods ||
    itemNorm === "inventory" ||
    trackInventory ||
    Boolean(text(item.inventory_account_id))
  ) {
    return {
      itemType,
      productType,
      isInventory: true,
      isService: false,
    };
  }

  // Ambiguous (missing product_type): purchases-only stays non-service catalogue;
  // default sellable rows without a service product_type are stock, not services.
  if (itemNorm === "purchases") {
    return {
      itemType,
      productType,
      isInventory: true,
      isService: false,
    };
  }

  return {
    itemType,
    productType,
    isInventory: true,
    isService: false,
  };
}

function parseItem(row: unknown): ZohoCatalogItem | null {
  const item = asRecord(row);
  if (!item) return null;
  const itemId = text(item.item_id);
  const name = text(item.name);
  if (!itemId || !name) return null;

  const { itemType, productType, isInventory, isService } =
    classifyZohoCatalogItem(item);
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
    productType,
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
 * Zoho list `/items` often omits or under-specifies `product_type`.
 * Bulk `/itemdetails` carries the goods vs service flag used by Books exports.
 */
async function enrichProductTypes(input: {
  apiDomain: string;
  accessToken: string;
  organizationId: string;
  items: ZohoCatalogItem[];
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; items: ZohoCatalogItem[] } | { ok: false; error: string }> {
  const byId = new Map(input.items.map((item) => [item.itemId, item]));
  const ids = [...byId.keys()];
  const batchSize = 50;

  for (let offset = 0; offset < ids.length; offset += batchSize) {
    const chunk = ids.slice(offset, offset + batchSize);
    const result = await zohoBooksGet({
      apiDomain: input.apiDomain,
      accessToken: input.accessToken,
      path: "/itemdetails",
      query: {
        organization_id: input.organizationId,
        item_ids: chunk.join(","),
      },
      fetchImpl: input.fetchImpl,
    });
    if (!result.ok) return { ok: false, error: result.error };

    const record = asRecord(result.body);
    const detailRows = Array.isArray(record?.items)
      ? record.items
      : Array.isArray(record?.itemdetails)
        ? record.itemdetails
        : [];

    for (const row of detailRows) {
      const detailed = parseItem(row);
      if (!detailed) continue;
      const existing = byId.get(detailed.itemId);
      if (!existing) continue;
      // Detail payload wins for product_type / classification.
      byId.set(detailed.itemId, {
        ...existing,
        ...detailed,
        name: existing.name || detailed.name,
        sku: detailed.sku ?? existing.sku,
        unit: detailed.unit ?? existing.unit,
        status: detailed.status ?? existing.status,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return { ok: true, items: [...byId.values()] };
}

/**
 * Paginated Zoho Books catalogue: inventory goods AND services.
 * Uses Status.All, then enriches via /itemdetails so Product Type is correct.
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

  const enriched = await enrichProductTypes({
    apiDomain: input.apiDomain,
    accessToken: input.accessToken,
    organizationId: input.organizationId,
    items,
    fetchImpl: input.fetchImpl,
  });
  // Prefer itemdetails Product Type; if Zoho rejects the bulk call, keep list rows.
  return enriched.ok ? enriched : { ok: true, items };
}

/** @deprecated Prefer listAllCatalogItems — kept for call-site compatibility. */
export async function listAllInventoryItems(
  input: Parameters<typeof listAllCatalogItems>[0]
) {
  return listAllCatalogItems(input);
}

export type ZohoInventoryItem = ZohoCatalogItem;

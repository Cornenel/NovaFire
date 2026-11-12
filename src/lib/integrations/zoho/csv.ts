import {
  classifyZohoCatalogItem,
  type ZohoCatalogItem,
} from "./items";

/** Minimal RFC4180 CSV parse (quoted fields, commas, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function headerIndex(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, idx) => {
    map.set(h.trim().toLowerCase(), idx);
  });
  return map;
}

function cell(row: string[], index: Map<string, number>, ...names: string[]): string {
  for (const name of names) {
    const idx = index.get(name.toLowerCase());
    if (idx === undefined) continue;
    const value = row[idx]?.trim() ?? "";
    if (value) return value;
  }
  return "";
}

function parseMoney(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/ZAR/gi, "").replace(/,/g, "").trim();
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

/**
 * Parse a Zoho Books "Items" CSV export.
 * Classification uses Product Type only (goods → stock, service → service).
 */
export function parseZohoItemsCsv(text: string): {
  ok: true;
  items: ZohoCatalogItem[];
} | { ok: false; error: string } {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { ok: false, error: "CSV has no data rows." };
  }

  const index = headerIndex(rows[0] ?? []);
  if (!index.has("item id") || !index.has("item name") || !index.has("product type")) {
    return {
      ok: false,
      error:
        'CSV must be a Zoho Books Items export with "Item ID", "Item Name", and "Product Type" columns.',
    };
  }

  const items: ZohoCatalogItem[] = [];
  const seen = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const itemId = cell(row, index, "item id");
    const name = cell(row, index, "item name", "product name");
    const productType = cell(row, index, "product type");
    if (!itemId || !name || !productType) continue;
    if (seen.has(itemId)) continue;
    seen.add(itemId);

    const itemType = cell(row, index, "item type");
    const trackRaw = cell(row, index, "track inventory").toLowerCase();
    const trackInventory = trackRaw === "true" || trackRaw === "yes" || trackRaw === "1";
    const stockRaw = cell(row, index, "stock on hand");
    const stockOnHand = stockRaw ? parseMoney(stockRaw) : null;

    const classified = classifyZohoCatalogItem({
      item_type: itemType.toLowerCase().replace(/\s+/g, "_"),
      product_type: productType.toLowerCase(),
      track_inventory: trackInventory,
      stock_on_hand: stockOnHand,
      inventory_account_id: cell(row, index, "inventory account") || undefined,
    });

    items.push({
      itemId,
      name,
      description: cell(row, index, "description") || null,
      sku: cell(row, index, "sku") || null,
      status: cell(row, index, "status") || null,
      unit: cell(row, index, "usage unit", "unit name") || null,
      rate: parseMoney(cell(row, index, "rate")),
      stockOnHand: classified.isInventory ? stockOnHand : null,
      itemType: classified.itemType,
      productType: classified.productType,
      isInventory: classified.isInventory,
      isService: classified.isService,
    });
  }

  if (items.length === 0) {
    return { ok: false, error: "No valid Zoho item rows found in the CSV." };
  }

  return { ok: true, items };
}

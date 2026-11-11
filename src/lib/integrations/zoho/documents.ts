import { zohoBooksGet } from "./client";
import { FINANCIAL_WRITES_ENABLED } from "./types";

export type ZohoDocumentSummary = {
  documentType: "item" | "estimate" | "invoice";
  zohoDocumentId: string;
  documentNumber: string | null;
  documentStatus: string | null;
  documentDate: string | null;
  zohoContactId: string | null;
  contactName: string | null;
  currencyCode: string | null;
  total: number | null;
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

function parseRows(
  body: unknown,
  key: "items" | "estimates" | "invoices",
  documentType: ZohoDocumentSummary["documentType"],
  idKey: string,
  numberKey: string
): ZohoDocumentSummary[] {
  const record = asRecord(body);
  const rows = record && Array.isArray(record[key]) ? record[key] : [];
  const documents: ZohoDocumentSummary[] = [];
  for (const row of rows) {
    const item = asRecord(row);
    if (!item) continue;
    const zohoDocumentId = text(item[idKey]);
    if (!zohoDocumentId) continue;
    documents.push({
      documentType,
      zohoDocumentId,
      documentNumber: text(item[numberKey]) ?? text(item.name),
      documentStatus: text(item.status),
      documentDate: text(item.date),
      zohoContactId: text(item.customer_id),
      contactName: text(item.customer_name),
      currencyCode: text(item.currency_code),
      total: amount(item.total),
    });
  }
  return documents;
}

async function listDocuments(input: {
  apiDomain: string;
  accessToken: string;
  organizationId: string;
  path: "/items" | "/estimates" | "/invoices";
  key: "items" | "estimates" | "invoices";
  documentType: ZohoDocumentSummary["documentType"];
  idKey: string;
  numberKey: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; documents: ZohoDocumentSummary[] } | { ok: false; error: string }> {
  if (FINANCIAL_WRITES_ENABLED) {
    return { ok: false, error: "Zoho Books financial writes are disabled." };
  }
  const result = await zohoBooksGet({
    apiDomain: input.apiDomain,
    accessToken: input.accessToken,
    path: input.path,
    query: { organization_id: input.organizationId, page: 1, per_page: 50 },
    fetchImpl: input.fetchImpl,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    documents: parseRows(result.body, input.key, input.documentType, input.idKey, input.numberKey),
  };
}

export function listItems(input: {
  apiDomain: string;
  accessToken: string;
  organizationId: string;
  fetchImpl?: typeof fetch;
}) {
  return listDocuments({
    ...input,
    path: "/items",
    key: "items",
    documentType: "item",
    idKey: "item_id",
    numberKey: "name",
  });
}

export function listEstimates(input: {
  apiDomain: string;
  accessToken: string;
  organizationId: string;
  fetchImpl?: typeof fetch;
}) {
  return listDocuments({
    ...input,
    path: "/estimates",
    key: "estimates",
    documentType: "estimate",
    idKey: "estimate_id",
    numberKey: "estimate_number",
  });
}

export function listInvoices(input: {
  apiDomain: string;
  accessToken: string;
  organizationId: string;
  fetchImpl?: typeof fetch;
}) {
  return listDocuments({
    ...input,
    path: "/invoices",
    key: "invoices",
    documentType: "invoice",
    idKey: "invoice_id",
    numberKey: "invoice_number",
  });
}

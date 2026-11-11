import { z } from "zod";
import { zohoBooksGet } from "./client";
import { hasAnotherContactPage } from "./matching";
import type { ZohoContact } from "./types";

const contactSchema = z
  .object({
    contact_id: z.union([z.string(), z.number()]),
    contact_name: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    contact_type: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    vat_reg_no: z.string().nullable().optional(),
    tax_reg_no: z.string().nullable().optional(),
    billing_address: z.unknown().optional(),
    contact_persons: z.array(z.unknown()).optional(),
    custom_fields: z.array(z.unknown()).optional(),
  })
  .passthrough();

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function formatAddress(address: unknown): string | null {
  if (typeof address === "string") return text(address);
  if (!address || typeof address !== "object") return null;
  const record = address as Record<string, unknown>;
  const parts = ["address", "street2", "city", "state", "zip", "country"]
    .map((key) => (typeof record[key] === "string" ? text(record[key] as string) : null))
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : null;
}

function registrationFromCustom(fields: unknown[] | undefined): string | null {
  for (const field of fields ?? []) {
    if (!field || typeof field !== "object") continue;
    const record = field as Record<string, unknown>;
    const label = `${String(record.label ?? "")} ${String(record.api_name ?? "")}`.toLowerCase();
    if (!label.includes("registration")) continue;
    const value = record.value === undefined || record.value === null ? "" : String(record.value).trim();
    if (value) return value;
  }
  return null;
}

function personRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function parseZohoContact(
  input: unknown,
  detailLoaded: boolean
): ZohoContact | null {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return null;
  const contact = parsed.data;
  if (contact.contact_type && contact.contact_type !== "customer") return null;
  const contactId = String(contact.contact_id).trim();
  if (!contactId) return null;
  const people = (contact.contact_persons ?? [])
    .map((person) => personRecord(person))
    .filter((person): person is Record<string, unknown> => Boolean(person));
  const primary =
    people.find((person) => person.is_primary_contact === true) ?? people[0] ?? null;
  const personName = [primary?.first_name, primary?.last_name]
    .map((part) => (typeof part === "string" ? text(part) : null))
    .filter(Boolean)
    .join(" ");
  const personText = (key: string) =>
    primary && typeof primary[key] === "string" ? text(primary[key] as string) : null;
  return {
    contactId,
    contactName: text(contact.contact_name) ?? "",
    companyName: text(contact.company_name),
    email: text(contact.email) ?? personText("email"),
    phone: text(contact.phone) ?? personText("phone"),
    mobile: text(contact.mobile) ?? personText("mobile"),
    vatNumber: text(contact.vat_reg_no) ?? text(contact.tax_reg_no),
    registrationNumber: registrationFromCustom(contact.custom_fields),
    billingAddress: formatAddress(contact.billing_address),
    contactPerson: personName || null,
    status: text(contact.status),
    detailLoaded,
  };
}

function pageContext(body: unknown): { has_more_page?: boolean } | undefined {
  if (!body || typeof body !== "object" || !("page_context" in body)) return undefined;
  const context = (body as { page_context?: { has_more_page?: boolean } }).page_context;
  return context;
}

export async function listCustomerContacts(input: {
  apiDomain: string;
  accessToken: string;
  organizationId: string;
  fetchImpl?: typeof fetch;
  maxPages?: number;
}): Promise<{ ok: true; contacts: ZohoContact[] } | { ok: false; error: string }> {
  const contacts: ZohoContact[] = [];
  const maxPages = input.maxPages ?? 200;
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await zohoBooksGet({
      apiDomain: input.apiDomain,
      accessToken: input.accessToken,
      path: "/contacts",
      query: {
        organization_id: input.organizationId,
        contact_type: "customer",
        page,
        per_page: 200,
      },
      fetchImpl: input.fetchImpl,
    });
    if (!result.ok) return { ok: false, error: result.error };
    const rows =
      result.body && typeof result.body === "object" && "contacts" in result.body
        ? (result.body as { contacts?: unknown[] }).contacts ?? []
        : [];
    for (const row of rows) {
      const contact = parseZohoContact(row, false);
      if (contact) contacts.push(contact);
    }
    if (!hasAnotherContactPage(pageContext(result.body), rows.length)) break;
  }
  return { ok: true, contacts };
}

export async function getCustomerContact(input: {
  apiDomain: string;
  accessToken: string;
  organizationId: string;
  contactId: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; contact: ZohoContact | null } | { ok: false; error: string }> {
  const result = await zohoBooksGet({
    apiDomain: input.apiDomain,
    accessToken: input.accessToken,
    path: `/contacts/${encodeURIComponent(input.contactId)}`,
    query: { organization_id: input.organizationId },
    fetchImpl: input.fetchImpl,
  });
  if (!result.ok) return { ok: false, error: result.error };
  const row =
    result.body && typeof result.body === "object" && "contact" in result.body
      ? (result.body as { contact?: unknown }).contact
      : null;
  return { ok: true, contact: row ? parseZohoContact(row, true) : null };
}

/** Read-only Zoho Books scopes verified against the current Books OAuth docs.
 * Items are covered by ZohoBooks.settings.READ. ZohoBooks.items.READ is not
 * a published scope and is intentionally not requested.
 */
export const ZOHO_BOOKS_READ_SCOPES = [
  "ZohoBooks.settings.READ",
  "ZohoBooks.contacts.READ",
  "ZohoBooks.estimates.READ",
  "ZohoBooks.invoices.READ",
] as const;

export const FINANCIAL_WRITES_ENABLED = false as const;

export const CUSTOMER_ENRICHABLE_FIELDS = [
  "name",
  "trading_name",
  "email",
  "phone",
  "vat_number",
  "registration_number",
  "billing_address",
  "contact_person",
] as const;

export type CustomerEnrichableField = (typeof CUSTOMER_ENRICHABLE_FIELDS)[number];

export type FieldAction = "update" | "add" | "keep" | "preserve" | "conflict";

export type FieldProposal = {
  field: CustomerEnrichableField | "physical_address" | "site_addresses";
  label: string;
  existing: string | null;
  zoho: string | null;
  action: FieldAction;
};

export type MatchCategory =
  | "verified_match"
  | "needs_review"
  | "unmatched"
  | "conflict";

export type MatchConfidence = "high" | "medium" | "low" | "none";

export type MatchCandidate = {
  customerId: string;
  customerName: string;
  reason: string;
  score: number;
};

export type NovaCustomer = {
  id: string;
  name: string;
  tradingName: string | null;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  billingAddress: string | null;
  physicalAddress: string | null;
  contactPerson: string | null;
  legacyZohoCustomerId: string | null;
};

export type ZohoContact = {
  contactId: string;
  contactName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  billingAddress: string | null;
  contactPerson: string | null;
  status: string | null;
  detailLoaded: boolean;
};

export type ContactMapping = {
  zohoContactId: string;
  customerId: string;
};

export type MatchResult = {
  category: MatchCategory;
  customerId: string | null;
  method: string;
  confidence: MatchConfidence;
  reason: string;
  candidates: MatchCandidate[];
};

export type ApplyDecision =
  | "pending"
  | "approve_update"
  | "link"
  | "create_customer"
  | "skip"
  | "reject";

export type CustomerWritePlan =
  | { type: "noop"; reason: string }
  | { type: "blocked"; reason: string }
  | {
      type: "update";
      customerId: string;
      patch: Partial<Record<CustomerEnrichableField, string>>;
      previous: Partial<Record<CustomerEnrichableField, string | null>>;
    }
  | {
      type: "create";
      values: {
        name: string;
        trading_name: string | null;
        email: string | null;
        phone: string | null;
        vat_number: string | null;
        registration_number: string | null;
        billing_address: string | null;
        contact_person: string | null;
      };
    };

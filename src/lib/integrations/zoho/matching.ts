import type {
  ContactMapping,
  MatchCandidate,
  MatchResult,
  NovaCustomer,
  ZohoContact,
} from "./types";

const TRAILING_SUFFIXES = new Set([
  "pty",
  "ltd",
  "limited",
  "inc",
  "incorporated",
  "cc",
  "npc",
  "plc",
  "proprietary",
  "company",
  "co",
]);

export function normalizeCompanyName(value: string | null | undefined): string {
  const tokens = (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length > 1 && tokens[0] === "the") tokens.shift();
  while (tokens.length > 1 && TRAILING_SUFFIXES.has(tokens[tokens.length - 1]!)) {
    tokens.pop();
  }
  return tokens.join(" ");
}

export function significantTokens(value: string | null | undefined): string[] {
  return normalizeCompanyName(value).split(" ").filter(Boolean);
}

export function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function normalizePhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length >= 9) return digits.slice(-9);
  return digits;
}

export function normalizeIdentifier(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function jaccard(left: string[], right: string[]): number {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function isTokenSubset(shorter: string[], longer: string[]): boolean {
  if (shorter.length === 0 || longer.length === 0) return false;
  if (shorter.length > longer.length) return false;
  const haystack = new Set(longer);
  return shorter.every((token) => haystack.has(token));
}

function displayName(contact: ZohoContact): string {
  return contact.companyName?.trim() || contact.contactName.trim();
}

function customerNames(customer: NovaCustomer): string[] {
  return [customer.name, customer.tradingName ?? ""].filter((value) => value.trim());
}

function bestNameScore(contact: ZohoContact, customer: NovaCustomer): number {
  const incoming = [displayName(contact), contact.contactName, contact.companyName ?? ""]
    .filter(Boolean)
    .map((value) => significantTokens(value));
  const existing = customerNames(customer).map((value) => significantTokens(value));
  let best = 0;
  for (const left of incoming) {
    for (const right of existing) {
      best = Math.max(best, jaccard(left, right));
      if (isTokenSubset(left, right) || isTokenSubset(right, left)) best = Math.max(best, 0.67);
    }
  }
  return best;
}

function namesCompatible(contact: ZohoContact, customer: NovaCustomer): boolean {
  return exactName(contact, customer) || bestNameScore(contact, customer) >= 0.34;
}

function exactName(contact: ZohoContact, customer: NovaCustomer): boolean {
  const incoming = new Set(
    [displayName(contact), contact.contactName, contact.companyName ?? ""]
      .map((value) => normalizeCompanyName(value))
      .filter(Boolean)
  );
  return customerNames(customer).some((value) => incoming.has(normalizeCompanyName(value)));
}

function contactPhones(contact: ZohoContact): string[] {
  return [contact.phone, contact.mobile].map((value) => normalizePhone(value)).filter(Boolean);
}

function emailsMatch(contact: ZohoContact, customer: NovaCustomer): boolean {
  const email = normalizeEmail(contact.email);
  return Boolean(email) && email === normalizeEmail(customer.email);
}

function phonesMatch(contact: ZohoContact, customer: NovaCustomer): boolean {
  const phones = new Set(contactPhones(contact));
  const customerPhone = normalizePhone(customer.phone);
  return Boolean(customerPhone) && phones.has(customerPhone);
}

function identifierMatch(contact: ZohoContact, customer: NovaCustomer): "vat" | "registration" | null {
  const vat = normalizeIdentifier(contact.vatNumber);
  const registration = normalizeIdentifier(contact.registrationNumber);
  if (vat.length >= 6 && vat === normalizeIdentifier(customer.vatNumber)) return "vat";
  if (
    registration.length >= 5 &&
    registration === normalizeIdentifier(customer.registrationNumber)
  ) {
    return "registration";
  }
  return null;
}

function candidate(
  customer: NovaCustomer,
  reason: string,
  score: number
): MatchCandidate {
  return {
    customerId: customer.id,
    customerName: customer.name,
    reason,
    score,
  };
}

export function matchZohoContact(input: {
  contact: ZohoContact;
  customers: NovaCustomer[];
  mappings: ContactMapping[];
}): MatchResult {
  const mapped = input.mappings.find(
    (mapping) => mapping.zohoContactId === input.contact.contactId
  );
  if (mapped) {
    const customer = input.customers.find((item) => item.id === mapped.customerId);
    if (!customer) {
      return {
        category: "conflict",
        customerId: mapped.customerId,
        method: "existing_mapping",
        confidence: "none",
        reason: "This Zoho contact is mapped to a customer that no longer exists.",
        candidates: [],
      };
    }
    return {
      category: "verified_match",
      customerId: customer.id,
      method: "existing_mapping",
      confidence: "high",
      reason: "This Zoho contact is already mapped to the Nova Fire customer.",
      candidates: [candidate(customer, "Existing verified mapping", 1)],
    };
  }

  const mappedCustomerIds = new Set(input.mappings.map((mapping) => mapping.customerId));
  const emailCounts = new Map<string, number>();
  const phoneCounts = new Map<string, number>();
  for (const customer of input.customers) {
    const email = normalizeEmail(customer.email);
    const phone = normalizePhone(customer.phone);
    if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
    if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) ?? 0) + 1);
  }
  const contactEmail = normalizeEmail(input.contact.email);
  const emailIsShared =
    Boolean(contactEmail) && (emailCounts.get(contactEmail) ?? 0) > 1;
  const contactPhoneShared = contactPhones(input.contact).some(
    (phone) => (phoneCounts.get(phone) ?? 0) > 1
  );

  const legacy = input.customers.filter(
    (customer) =>
      customer.legacyZohoCustomerId &&
      customer.legacyZohoCustomerId === input.contact.contactId
  );
  if (legacy.length === 1 && !mappedCustomerIds.has(legacy[0]!.id)) {
    return {
      category: "verified_match",
      customerId: legacy[0]!.id,
      method: "legacy_zoho_customer_id",
      confidence: "high",
      reason: "The stored legacy Zoho customer id matches this Books contact.",
      candidates: [candidate(legacy[0]!, "Legacy Zoho customer id", 1)],
    };
  }
  if (legacy.length > 1) {
    return {
      category: "needs_review",
      customerId: null,
      method: "legacy_zoho_customer_id",
      confidence: "low",
      reason: "More than one Nova Fire customer stores this Zoho contact id.",
      candidates: legacy.map((customer) => candidate(customer, "Shared legacy Zoho id", 0.4)),
    };
  }

  const identifierHits = input.customers
    .map((customer) => ({ customer, kind: identifierMatch(input.contact, customer) }))
    .filter((hit): hit is { customer: NovaCustomer; kind: "vat" | "registration" } =>
      Boolean(hit.kind)
    );
  if (identifierHits.length === 1) {
    const hit = identifierHits[0]!;
    const alreadyMapped = mappedCustomerIds.has(hit.customer.id);
    if (!alreadyMapped && namesCompatible(input.contact, hit.customer)) {
      return {
        category: "verified_match",
        customerId: hit.customer.id,
        method: hit.kind === "vat" ? "vat_number" : "registration_number",
        confidence: "high",
        reason: "A unique business identifier matches and the names are compatible.",
        candidates: [candidate(hit.customer, "Unique business identifier", 0.98)],
      };
    }
    return {
      category: "needs_review",
      customerId: null,
      method: hit.kind === "vat" ? "vat_number" : "registration_number",
      confidence: "medium",
      reason: alreadyMapped
        ? "The identifier matches a customer already mapped to another Zoho contact."
        : "The identifier matches, but the company names do not corroborate it.",
      candidates: [candidate(hit.customer, "Identifier needs confirmation", 0.7)],
    };
  }
  if (identifierHits.length > 1) {
    return {
      category: "needs_review",
      customerId: null,
      method: "business_identifier",
      confidence: "low",
      reason: "The business identifier matches more than one Nova Fire customer.",
      candidates: identifierHits.map((hit) =>
        candidate(hit.customer, "Shared business identifier", 0.45)
      ),
    };
  }

  const exact = input.customers.filter((customer) => exactName(input.contact, customer));
  if (exact.length === 1) {
    const customer = exact[0]!;
    const emailSupports = emailsMatch(input.contact, customer) && !emailIsShared;
    const phoneSupports = phonesMatch(input.contact, customer) && !contactPhoneShared;
    const emailConflicts =
      Boolean(contactEmail) &&
      Boolean(normalizeEmail(customer.email)) &&
      !emailsMatch(input.contact, customer);
    const phoneConflicts =
      contactPhones(input.contact).length > 0 &&
      Boolean(normalizePhone(customer.phone)) &&
      !phonesMatch(input.contact, customer);
    const contradictory = emailConflicts && phoneConflicts;
    const noContactData =
      !contactEmail &&
      contactPhones(input.contact).length === 0 &&
      !normalizeEmail(customer.email) &&
      !normalizePhone(customer.phone);
    if (
      !mappedCustomerIds.has(customer.id) &&
      !contradictory &&
      (emailSupports || phoneSupports || noContactData)
    ) {
      return {
        category: "verified_match",
        customerId: customer.id,
        method: "normalized_name",
        confidence: "high",
        reason: noContactData
          ? "The normalised company name is unique and neither record has a conflicting contact."
          : "The normalised company name is unique and a contact detail agrees.",
        candidates: [candidate(customer, "Normalised company name", 0.9)],
      };
    }
    return {
      category: "needs_review",
      customerId: null,
      method: "normalized_name",
      confidence: "medium",
      reason: mappedCustomerIds.has(customer.id)
        ? "The name matches a customer already mapped to another Zoho contact."
        : "The company name matches, but the contact details do not confirm it.",
      candidates: [candidate(customer, "Name needs confirmation", 0.6)],
    };
  }
  if (exact.length > 1) {
    return {
      category: "needs_review",
      customerId: null,
      method: "normalized_name",
      confidence: "low",
      reason: "More than one Nova Fire customer has this normalised name.",
      candidates: exact.map((customer) => candidate(customer, "Duplicate normalised name", 0.5)),
    };
  }

  const similar = input.customers
    .map((customer) => ({ customer, score: bestNameScore(input.contact, customer) }))
    .filter((item) => item.score >= 0.5)
    .sort((a, b) => b.score - a.score);

  const supporting = similar.filter((item) => {
    const emailOk = emailsMatch(input.contact, item.customer) && !emailIsShared;
    const phoneOk = phonesMatch(input.contact, item.customer) && !contactPhoneShared;
    return (emailOk || phoneOk) && !mappedCustomerIds.has(item.customer.id);
  });
  if (supporting.length === 1) {
    return {
      category: "verified_match",
      customerId: supporting[0]!.customer.id,
      method: "abbreviated_name",
      confidence: "high",
      reason: "The trading name is contained in the legal name and a unique contact detail agrees.",
      candidates: [
        candidate(supporting[0]!.customer, "Abbreviated name with contact support", supporting[0]!.score),
      ],
    };
  }

  const reviewPool = similar.filter((item) => item.score >= 0.5).slice(0, 5);
  if (reviewPool.length > 0) {
    return {
      category: "needs_review",
      customerId: null,
      method: "fuzzy_name",
      confidence: "low",
      reason:
        "The company names are similar. A shared email or phone number is not enough to link them automatically.",
      candidates: reviewPool.map((item) =>
        candidate(item.customer, "Similar company name", item.score)
      ),
    };
  }

  return {
    category: "unmatched",
    customerId: null,
    method: "none",
    confidence: "none",
    reason: "No confident Nova Fire customer match was found.",
    candidates: [],
  };
}

export function hasAnotherContactPage(
  pageContext: { has_more_page?: boolean } | undefined,
  receivedCount: number
): boolean {
  return pageContext?.has_more_page === true && receivedCount > 0;
}

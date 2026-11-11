import { jaccard, normalizeCompanyName, significantTokens, isTokenSubset } from "./matching";
import type { FieldProposal, NovaCustomer, ZohoContact } from "./types";

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function same(left: string | null, right: string | null): boolean {
  return (left ?? "").trim().toLowerCase() === (right ?? "").trim().toLowerCase();
}

function legalName(contact: ZohoContact): string | null {
  return clean(contact.companyName) ?? clean(contact.contactName);
}

function moreCompleteName(current: string, incoming: string): boolean {
  const currentTokens = significantTokens(current);
  const incomingTokens = significantTokens(incoming);
  if (
    incomingTokens.length > currentTokens.length &&
    isTokenSubset(currentTokens, incomingTokens)
  ) {
    return true;
  }
  const incomingLegal = /\b(pty|ltd|limited|cc|npc)\b/i.test(incoming);
  const currentLegal = /\b(pty|ltd|limited|cc|npc)\b/i.test(current);
  return (
    incomingLegal &&
    !currentLegal &&
    jaccard(currentTokens, incomingTokens) >= 0.5
  );
}

function proposal(
  field: FieldProposal["field"],
  label: string,
  existing: string | null,
  zoho: string | null,
  action: FieldProposal["action"]
): FieldProposal {
  return { field, label, existing, zoho, action };
}

function billingField(
  field: FieldProposal["field"],
  label: string,
  existing: string | null,
  zoho: string | null,
  preferZoho: boolean
): FieldProposal {
  if (!zoho) return proposal(field, label, existing, zoho, "keep");
  if (!existing) return proposal(field, label, existing, zoho, "add");
  if (same(existing, zoho)) return proposal(field, label, existing, zoho, "keep");
  return proposal(field, label, existing, zoho, preferZoho ? "update" : "conflict");
}

export function proposeCustomerChanges(
  customer: NovaCustomer,
  contact: ZohoContact
): FieldProposal[] {
  const zohoName = legalName(contact);
  const existingName = clean(customer.name);
  let nameAction: FieldProposal["action"] = "keep";
  if (zohoName && existingName && !same(existingName, zohoName)) {
    nameAction = moreCompleteName(existingName, zohoName) ? "update" : "conflict";
  } else if (zohoName && !existingName) {
    nameAction = "add";
  }

  const tradingExisting = clean(customer.tradingName);
  let tradingZoho: string | null = null;
  let tradingAction: FieldProposal["action"] = "keep";
  if (!tradingExisting && nameAction === "update" && existingName && zohoName && !same(existingName, zohoName)) {
    tradingZoho = existingName;
    tradingAction = "add";
  } else if (
    !tradingExisting &&
    clean(contact.contactName) &&
    zohoName &&
    normalizeCompanyName(contact.contactName) !== normalizeCompanyName(zohoName)
  ) {
    tradingZoho = clean(contact.contactName);
    tradingAction = "add";
  }

  const zohoPhone = clean(contact.phone) ?? clean(contact.mobile);
  const proposals: FieldProposal[] = [
    proposal("name", "Company name", existingName, zohoName, nameAction),
    proposal("trading_name", "Trading name", tradingExisting, tradingZoho, tradingAction),
    billingField("email", "Email", clean(customer.email), clean(contact.email), false),
    billingField("phone", "Telephone", clean(customer.phone), zohoPhone, false),
    billingField(
      "vat_number",
      "VAT number",
      clean(customer.vatNumber),
      clean(contact.vatNumber),
      true
    ),
    billingField(
      "registration_number",
      "Company registration",
      clean(customer.registrationNumber),
      clean(contact.registrationNumber),
      true
    ),
    billingField(
      "billing_address",
      "Billing address",
      clean(customer.billingAddress),
      clean(contact.billingAddress),
      true
    ),
    billingField(
      "contact_person",
      "Accounting contact",
      clean(customer.contactPerson),
      clean(contact.contactPerson),
      false
    ),
    proposal(
      "physical_address",
      "Physical address",
      clean(customer.physicalAddress),
      clean(contact.billingAddress),
      "preserve"
    ),
    proposal(
      "site_addresses",
      "Site addresses",
      "Linked service sites stay on this customer",
      "Billing address is not copied onto sites",
      "preserve"
    ),
  ];
  return proposals;
}

export function countProposalActions(proposals: FieldProposal[]): Record<FieldProposal["action"], number> {
  return proposals.reduce(
    (counts, item) => {
      counts[item.action] += 1;
      return counts;
    },
    { update: 0, add: 0, keep: 0, preserve: 0, conflict: 0 }
  );
}

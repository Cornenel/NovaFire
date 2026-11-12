import { proposeCustomerChanges } from "./proposals";
import {
  CUSTOMER_ENRICHABLE_FIELDS,
  type ApplyDecision,
  type CustomerEnrichableField,
  type CustomerWritePlan,
  type FieldProposal,
  type NovaCustomer,
  type ZohoContact,
} from "./types";

/** Fields Zoho may overwrite when the proposal action is `update` (not conflict). */
const APPLY_ON_APPROVAL = new Set<CustomerEnrichableField>([
  "name",
  "trading_name",
  "vat_number",
  "registration_number",
  "billing_address",
  // Missing-only fills for these come through `add` (always safe).
  // `update` for email/phone/contact_person is never proposed; conflicts stay opt-in.
]);

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function currentValue(customer: NovaCustomer, field: CustomerEnrichableField): string | null {
  switch (field) {
    case "name":
      return clean(customer.name);
    case "trading_name":
      return clean(customer.tradingName);
    case "email":
      return clean(customer.email);
    case "phone":
      return clean(customer.phone);
    case "vat_number":
      return clean(customer.vatNumber);
    case "registration_number":
      return clean(customer.registrationNumber);
    case "billing_address":
      return clean(customer.billingAddress);
    case "contact_person":
      return clean(customer.contactPerson);
  }
}

export function reconcileField(
  proposal: FieldProposal,
  current: string | null,
  applyConflicts: boolean
): { include: boolean; value: string | null } {
  if (proposal.field === "physical_address" || proposal.field === "site_addresses") {
    return { include: false, value: null };
  }
  if (proposal.action === "keep" || proposal.action === "preserve") {
    return { include: false, value: null };
  }
  const incoming = clean(proposal.zoho);
  if (!incoming) return { include: false, value: null };
  if (proposal.action === "conflict" && !applyConflicts) {
    return { include: false, value: null };
  }
  if (proposal.action === "add") {
    return { include: !current, value: incoming };
  }
  if (proposal.action === "update" || proposal.action === "conflict") {
    const field = proposal.field;
    if (!APPLY_ON_APPROVAL.has(field) && proposal.action === "update") {
      return { include: false, value: null };
    }
    if (current !== (proposal.existing ?? null)) return { include: false, value: null };
    if (current === incoming) return { include: false, value: null };
    return { include: true, value: incoming };
  }
  return { include: false, value: null };
}

export function planCustomerWrite(input: {
  decision: ApplyDecision;
  customer: NovaCustomer | null;
  contact: ZohoContact;
  proposals?: FieldProposal[];
  applyConflicts?: boolean;
  confirmDistinct?: boolean;
  plausibleCandidateCount?: number;
  identifierTaken?: boolean;
}): CustomerWritePlan {
  if (input.decision === "pending" || input.decision === "skip" || input.decision === "reject") {
    return { type: "noop", reason: "No customer write was approved." };
  }

  if (input.decision === "create_customer") {
    if (!input.confirmDistinct) {
      return {
        type: "blocked",
        reason: "Creating a customer requires explicit confirmation that it is not a duplicate.",
      };
    }
    if (input.identifierTaken) {
      return {
        type: "blocked",
        reason: "A Nova Fire customer already uses this VAT or registration number.",
      };
    }
    const name = clean(input.contact.companyName) ?? clean(input.contact.contactName);
    if (!name) return { type: "blocked", reason: "Zoho did not provide a company name." };
    return {
      type: "create",
      values: {
        name,
        trading_name:
          clean(input.contact.contactName) &&
          clean(input.contact.contactName) !== name
            ? clean(input.contact.contactName)
            : null,
        email: clean(input.contact.email),
        phone: clean(input.contact.phone) ?? clean(input.contact.mobile),
        vat_number: clean(input.contact.vatNumber),
        registration_number: clean(input.contact.registrationNumber),
        billing_address: clean(input.contact.billingAddress),
        contact_person: clean(input.contact.contactPerson),
      },
    };
  }

  if (!input.customer) {
    return { type: "blocked", reason: "The selected Nova Fire customer no longer exists." };
  }

  const proposals = input.proposals ?? proposeCustomerChanges(input.customer, input.contact);
  const patch: Partial<Record<CustomerEnrichableField, string>> = {};
  const previous: Partial<Record<CustomerEnrichableField, string | null>> = {};
  for (const item of proposals) {
    if (item.field === "physical_address" || item.field === "site_addresses") continue;
    const field = item.field;
    if (!CUSTOMER_ENRICHABLE_FIELDS.includes(field)) continue;
    const current = currentValue(input.customer, field);
    const decision = reconcileField(item, current, input.applyConflicts === true);
    if (!decision.include || !decision.value) continue;
    patch[field] = decision.value;
    previous[field] = current;
  }

  return {
    type: "update",
    customerId: input.customer.id,
    patch,
    previous,
  };
}

export function customerPatchTouchesOperationalChildren(
  patch: Partial<Record<CustomerEnrichableField, string>>
): boolean {
  const keys = Object.keys(patch);
  return keys.some((key) => !CUSTOMER_ENRICHABLE_FIELDS.includes(key as CustomerEnrichableField));
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { planCustomerWrite } from "./apply-plan";
import { getCustomerContact, listCustomerContacts } from "./contacts";
import { getConnection } from "./connection";
import { matchZohoContact, normalizeCompanyName, normalizeIdentifier } from "./matching";
import { countProposalActions, proposeCustomerChanges } from "./proposals";
import { getValidAccessToken } from "./tokens";
import type { FieldProposal, NovaCustomer, ZohoContact } from "./types";

const DETAIL_LIMIT = 250;
const STALE_RUN_MS = 20 * 60 * 1000;

type SyncItemRow = {
  id: string;
  run_id: string;
  organization_id: string;
  zoho_contact_id: string;
  zoho_display_name: string;
  customer_id: string | null;
  category: string;
  match_method: string | null;
  confidence: string | null;
  candidates: Array<{ customerId: string; customerName?: string; reason: string; score: number }>;
  proposed_changes: unknown;
  zoho_snapshot: ZohoContact;
  decision: string;
  decision_customer_id: string | null;
  apply_conflicts: boolean;
  confirm_distinct: boolean;
  apply_status: string | null;
};

function admin(): SupabaseClient {
  return createAdminClient();
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

function displayName(contact: ZohoContact): string {
  return contact.companyName?.trim() || contact.contactName.trim() || contact.contactId;
}

function toCustomer(row: Record<string, unknown>): NovaCustomer {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    tradingName: (row.trading_name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    vatNumber: (row.vat_number as string | null) ?? null,
    registrationNumber: (row.registration_number as string | null) ?? null,
    billingAddress: (row.billing_address as string | null) ?? null,
    physicalAddress: (row.physical_address as string | null) ?? null,
    contactPerson: (row.contact_person as string | null) ?? null,
    legacyZohoCustomerId: (row.legacy_zoho_customer_id as string | null) ?? null,
  };
}

const CUSTOMER_COLUMNS =
  "id, name, trading_name, email, phone, vat_number, registration_number, billing_address, physical_address, contact_person, legacy_zoho_customer_id";

async function loadCustomers(supabase: SupabaseClient): Promise<NovaCustomer[]> {
  const { data, error } = await supabase.from("customers").select(CUSTOMER_COLUMNS);
  if (error) throw new Error("Nova Fire customers could not be loaded.");
  return (data ?? []).map((row) => toCustomer(row as Record<string, unknown>));
}

async function loadMappings(organizationId: string) {
  const { data, error } = await admin()
    .from("zoho_books_contact_mappings")
    .select("zoho_contact_id, customer_id")
    .eq("organization_id", organizationId)
    .eq("match_status", "verified");
  if (error) throw new Error("Zoho customer mappings could not be loaded.");
  return (data ?? []).map((row) => ({
    zohoContactId: String(row.zoho_contact_id),
    customerId: String(row.customer_id),
  }));
}

async function writeAudit(input: {
  runId: string | null;
  customerId: string | null;
  organizationId: string;
  zohoContactId: string;
  eventType: string;
  matchMethod: string | null;
  reviewStatus: string | null;
  fieldsChanged: string[];
  previous: Record<string, string | null>;
  next: Record<string, string | null>;
  actorId: string;
  success: boolean;
  message: string;
}) {
  await admin().from("zoho_books_audit_events").insert({
    run_id: input.runId,
    customer_id: input.customerId,
    organization_id: input.organizationId,
    zoho_contact_id: input.zohoContactId,
    event_type: input.eventType,
    match_method: input.matchMethod,
    review_status: input.reviewStatus,
    fields_changed: input.fieldsChanged,
    previous_values: input.previous,
    new_values: input.next,
    actor_id: input.actorId,
    success: input.success,
    message: input.message.slice(0, 300),
  });
}

export async function runCustomerPreview(input: {
  actorId: string;
  supabase: SupabaseClient;
}): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  const connection = await getConnection();
  if (!connection || connection.status !== "connected" || !connection.organization_id || !connection.api_domain) {
    return { ok: false, error: "Select a Zoho Books organisation and test the connection first." };
  }
  if (!connection.last_connection_test_ok) {
    return { ok: false, error: "Test the Zoho Books connection before previewing customers." };
  }

  const staleBefore = new Date(Date.now() - STALE_RUN_MS).toISOString();
  await admin()
    .from("zoho_books_sync_runs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: "The preview timed out before it finished.",
    })
    .eq("organization_id", connection.organization_id)
    .eq("status", "running")
    .lt("started_at", staleBefore);

  const { data: run, error: runError } = await admin()
    .from("zoho_books_sync_runs")
    .insert({
      organization_id: connection.organization_id,
      mode: "dry_run",
      status: "running",
      started_by: input.actorId,
      summary: {},
    })
    .select("id")
    .single();

  if (runError || !run) {
    if (isUniqueViolation(runError)) {
      return { ok: false, error: "A customer preview is already running." };
    }
    return { ok: false, error: "The customer preview could not be started." };
  }
  const runId = run.id as string;

  try {
    const token = await getValidAccessToken(connection.id);
    if (!token.ok || !token.organizationId) {
      throw new Error(token.ok ? "Select a Zoho Books organisation first." : token.error);
    }
    const listed = await listCustomerContacts({
      apiDomain: token.apiDomain,
      accessToken: token.accessToken,
      organizationId: token.organizationId,
    });
    if (!listed.ok) throw new Error(listed.error);

    const customers = await loadCustomers(input.supabase);
    const mappings = await loadMappings(token.organizationId);
    const matches = listed.contacts.map((contact) => ({
      contact,
      match: matchZohoContact({ contact, customers, mappings }),
    }));

    let detailFetched = 0;
    let detailSkipped = 0;
    for (const item of matches) {
      if (item.match.category === "unmatched") continue;
      if (detailFetched >= DETAIL_LIMIT) {
        detailSkipped += 1;
        continue;
      }
      const detailed = await getCustomerContact({
        apiDomain: token.apiDomain,
        accessToken: token.accessToken,
        organizationId: token.organizationId,
        contactId: item.contact.contactId,
      });
      detailFetched += 1;
      if (detailed.ok && detailed.contact) item.contact = detailed.contact;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    const customerById = new Map(customers.map((customer) => [customer.id, customer]));
    const rows = matches.map(({ contact, match }) => {
      const customer = match.customerId ? customerById.get(match.customerId) ?? null : null;
      const proposals = customer ? proposeCustomerChanges(customer, contact) : [];
      return {
        run_id: runId,
        organization_id: token.organizationId,
        zoho_contact_id: contact.contactId,
        zoho_display_name: displayName(contact),
        customer_id: customer?.id ?? null,
        customer_name_snapshot: customer?.name ?? null,
        category: match.category,
        match_method: match.method,
        confidence: match.confidence,
        candidates: match.candidates,
        proposed_changes: proposals,
        zoho_snapshot: contact,
        decision: "pending",
      };
    });

    for (let index = 0; index < rows.length; index += 100) {
      const { error } = await admin().from("zoho_books_sync_items").insert(rows.slice(index, index + 100));
      if (error) throw new Error("The preview results could not be saved.");
    }

    const summary = {
      zohoContacts: listed.contacts.length,
      verified: rows.filter((row) => row.category === "verified_match").length,
      needsReview: rows.filter((row) => row.category === "needs_review").length,
      unmatched: rows.filter((row) => row.category === "unmatched").length,
      conflicts: rows.filter((row) => row.category === "conflict").length,
      updates: rows.filter((row) =>
        countProposalActions(row.proposed_changes).update +
          countProposalActions(row.proposed_changes).add >
        0
      ).length,
      detailFetched,
      detailSkipped,
      customersCreated: 0,
      financialWrites: 0,
    };

    await admin()
      .from("zoho_books_sync_runs")
      .update({
        status: "awaiting_review",
        completed_at: new Date().toISOString(),
        summary,
      })
      .eq("id", runId);
    await admin()
      .from("zoho_books_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    return { ok: true, runId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The customer preview failed.";
    await admin()
      .from("zoho_books_sync_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: message.slice(0, 300),
      })
      .eq("id", runId);
    return { ok: false, error: message.slice(0, 300) };
  }
}

function identifierTaken(contact: ZohoContact, customers: NovaCustomer[]): boolean {
  const vat = normalizeIdentifier(contact.vatNumber);
  const registration = normalizeIdentifier(contact.registrationNumber);
  const names = [contact.companyName, contact.contactName]
    .map((value) => normalizeCompanyName(value))
    .filter(Boolean);
  return customers.some((customer) => {
    if (vat.length >= 6 && vat === normalizeIdentifier(customer.vatNumber)) return true;
    if (
      registration.length >= 5 &&
      registration === normalizeIdentifier(customer.registrationNumber)
    ) {
      return true;
    }
    const customerNames = [customer.name, customer.tradingName ?? ""]
      .map((value) => normalizeCompanyName(value))
      .filter(Boolean);
    return names.some((name) => customerNames.includes(name));
  });
}

async function ensureMapping(input: {
  organizationId: string;
  zohoContactId: string;
  customerId: string;
  method: string;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing, error: readError } = await admin()
    .from("zoho_books_contact_mappings")
    .select("customer_id")
    .eq("organization_id", input.organizationId)
    .eq("zoho_contact_id", input.zohoContactId)
    .maybeSingle();
  if (readError) return { ok: false, error: "The customer mapping could not be checked." };
  if (existing) {
    if (String(existing.customer_id) !== input.customerId) {
      return {
        ok: false,
        error: "This Zoho contact is already mapped to a different Nova Fire customer.",
      };
    }
    return { ok: true };
  }
  const { error } = await admin().from("zoho_books_contact_mappings").insert({
    organization_id: input.organizationId,
    zoho_contact_id: input.zohoContactId,
    customer_id: input.customerId,
    match_method: input.method ?? "manual",
    match_status: "verified",
    approved_by: input.actorId,
    approved_at: new Date().toISOString(),
  });
  if (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "This Zoho contact was mapped by another request." };
    }
    return { ok: false, error: "The customer mapping could not be saved." };
  }
  return { ok: true };
}

export async function applyCustomerDecisions(input: {
  actorId: string;
  supabase: SupabaseClient;
  runId: string;
  applyVerified?: boolean;
  applyConflicts?: boolean;
}): Promise<{ ok: true; applied: number; failed: number } | { ok: false; error: string }> {
  const connection = await getConnection();
  if (!connection?.organization_id) {
    return { ok: false, error: "Zoho Books is not connected to an organisation." };
  }
  const { data: run, error: runError } = await admin()
    .from("zoho_books_sync_runs")
    .select("id, organization_id, status")
    .eq("id", input.runId)
    .maybeSingle();
  if (runError || !run) return { ok: false, error: "That preview could not be found." };
  if (run.organization_id !== connection.organization_id) {
    return { ok: false, error: "That preview belongs to a different Zoho organisation." };
  }
  if (run.status === "running") return { ok: false, error: "That preview is still running." };

  const { data: items, error: itemError } = await admin()
    .from("zoho_books_sync_items")
    .select(
      "id, run_id, organization_id, zoho_contact_id, zoho_display_name, customer_id, category, match_method, confidence, candidates, proposed_changes, zoho_snapshot, decision, decision_customer_id, apply_conflicts, confirm_distinct, apply_status"
    )
    .eq("run_id", input.runId);
  if (itemError || !items) return { ok: false, error: "Preview items could not be loaded." };

  const customers = await loadCustomers(input.supabase);
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  let applied = 0;
  let failed = 0;

  for (const raw of items as SyncItemRow[]) {
    if (raw.apply_status === "applied") continue;
    const treatAsVerified =
      input.applyVerified === true &&
      raw.category === "verified_match" &&
      (raw.decision === "pending" || raw.decision === "approve_update");
    const decision = treatAsVerified ? "approve_update" : raw.decision;
    if (decision === "pending" || decision === "skip" || decision === "reject") continue;

    const contact = raw.zoho_snapshot;
    const targetId =
      decision === "link"
        ? raw.decision_customer_id
        : decision === "create_customer"
          ? null
          : raw.customer_id;
    const customer = targetId ? customerById.get(targetId) ?? null : null;
    const plausible = Array.isArray(raw.candidates) ? raw.candidates.length : 0;
    const storedProposals = Array.isArray(raw.proposed_changes)
      ? (raw.proposed_changes as FieldProposal[])
      : undefined;
    const plan = planCustomerWrite({
      decision: decision as "approve_update" | "link" | "create_customer",
      customer,
      contact,
      proposals: decision === "link" ? undefined : storedProposals,
      applyConflicts: treatAsVerified ? input.applyConflicts === true : raw.apply_conflicts,
      confirmDistinct: raw.confirm_distinct,
      plausibleCandidateCount: plausible,
      identifierTaken: decision === "create_customer" ? identifierTaken(contact, customers) : false,
    });

    if (plan.type === "noop") {
      await admin().from("zoho_books_sync_items").update({ apply_status: "skipped" }).eq("id", raw.id);
      continue;
    }
    if (plan.type === "blocked") {
      failed += 1;
      await admin()
        .from("zoho_books_sync_items")
        .update({ apply_status: "failed", apply_error: plan.reason.slice(0, 300) })
        .eq("id", raw.id);
      await writeAudit({
        runId: input.runId,
        customerId: customer?.id ?? null,
        organizationId: raw.organization_id,
        zohoContactId: raw.zoho_contact_id,
        eventType: "apply_blocked",
        matchMethod: raw.match_method,
        reviewStatus: raw.category,
        fieldsChanged: [],
        previous: {},
        next: {},
        actorId: input.actorId,
        success: false,
        message: plan.reason,
      });
      continue;
    }

    try {
      let customerId = "";
      let previous: Record<string, string | null> = {};
      let next: Record<string, string | null> = {};
      if (plan.type === "create") {
        const { data: created, error: createError } = await input.supabase
          .from("customers")
          .insert({ ...plan.values, created_by: input.actorId })
          .select("id")
          .single();
        if (createError || !created) throw new Error("The customer could not be created.");
        customerId = created.id as string;
        next = { ...plan.values };
        const mapped = await ensureMapping({
          organizationId: raw.organization_id,
          zohoContactId: raw.zoho_contact_id,
          customerId,
          method: "admin_create",
          actorId: input.actorId,
        });
        if (!mapped.ok) {
          await input.supabase.from("customers").delete().eq("id", customerId);
          throw new Error(mapped.error);
        }
      } else {
        customerId = plan.customerId;
        if (customerId !== customer?.id) {
          throw new Error("The customer update did not keep the original customer id.");
        }
        if (Object.keys(plan.patch).length > 0) {
          const { error: updateError } = await input.supabase
            .from("customers")
            .update(plan.patch)
            .eq("id", customerId);
          if (updateError) throw new Error("The customer could not be updated.");
        }
        previous = plan.previous;
        next = plan.patch;
        const mapped = await ensureMapping({
          organizationId: raw.organization_id,
          zohoContactId: raw.zoho_contact_id,
          customerId,
          method: raw.match_method ?? "manual",
          actorId: input.actorId,
        });
        if (!mapped.ok) throw new Error(mapped.error);
      }

      applied += 1;
      await admin()
        .from("zoho_books_sync_items")
        .update({
          decision,
          customer_id: customerId,
          apply_status: "applied",
          apply_error: null,
          decided_by: input.actorId,
          decided_at: new Date().toISOString(),
        })
        .eq("id", raw.id);
      await writeAudit({
        runId: input.runId,
        customerId,
        organizationId: raw.organization_id,
        zohoContactId: raw.zoho_contact_id,
        eventType: plan.type === "create" ? "customer_created" : "customer_enriched",
        matchMethod: raw.match_method,
        reviewStatus: raw.category,
        fieldsChanged: Object.keys(next),
        previous,
        next,
        actorId: input.actorId,
        success: true,
        message:
          plan.type === "create"
            ? "A new customer was created after duplicate checks and administrator approval."
            : "The existing customer was enriched without changing the customer id.",
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "The change could not be applied.";
      await admin()
        .from("zoho_books_sync_items")
        .update({ apply_status: "failed", apply_error: message.slice(0, 300) })
        .eq("id", raw.id);
      await writeAudit({
        runId: input.runId,
        customerId: customer?.id ?? null,
        organizationId: raw.organization_id,
        zohoContactId: raw.zoho_contact_id,
        eventType: "apply_failed",
        matchMethod: raw.match_method,
        reviewStatus: raw.category,
        fieldsChanged: [],
        previous: {},
        next: {},
        actorId: input.actorId,
        success: false,
        message,
      });
    }
  }

  await admin()
    .from("zoho_books_sync_runs")
    .update({
      status: failed > 0 ? "awaiting_review" : "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.runId);

  return { ok: true, applied, failed };
}

export async function saveReviewDecision(input: {
  actorId: string;
  runId: string;
  itemId: string;
  decision: "link" | "create_customer" | "skip" | "reject";
  customerId?: string | null;
  confirmDistinct?: boolean;
  applyConflicts?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: item, error } = await admin()
    .from("zoho_books_sync_items")
    .select("id, run_id, category")
    .eq("id", input.itemId)
    .eq("run_id", input.runId)
    .maybeSingle();
  if (error || !item) return { ok: false, error: "That review item could not be found." };
  if (input.decision === "link" && !input.customerId) {
    return { ok: false, error: "Choose the Nova Fire customer to link." };
  }
  if (input.decision === "create_customer" && item.category !== "unmatched" && item.category !== "needs_review") {
    return { ok: false, error: "A matched customer cannot be created again." };
  }
  const { error: updateError } = await admin()
    .from("zoho_books_sync_items")
    .update({
      decision: input.decision,
      decision_customer_id: input.decision === "link" ? input.customerId : null,
      confirm_distinct: input.confirmDistinct === true,
      apply_conflicts: input.applyConflicts === true,
      decided_by: input.actorId,
      decided_at: new Date().toISOString(),
      apply_status: null,
      apply_error: null,
    })
    .eq("id", input.itemId);
  if (updateError) return { ok: false, error: "The review decision could not be saved." };
  return { ok: true };
}

export async function unlinkMapping(input: {
  actorId: string;
  mappingId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: mapping, error } = await admin()
    .from("zoho_books_contact_mappings")
    .select("id, organization_id, zoho_contact_id, customer_id, match_method")
    .eq("id", input.mappingId)
    .maybeSingle();
  if (error || !mapping) return { ok: false, error: "That mapping could not be found." };
  const { error: deleteError } = await admin()
    .from("zoho_books_contact_mappings")
    .delete()
    .eq("id", input.mappingId);
  if (deleteError) return { ok: false, error: "The mapping could not be removed." };
  await writeAudit({
    runId: null,
    customerId: String(mapping.customer_id),
    organizationId: String(mapping.organization_id),
    zohoContactId: String(mapping.zoho_contact_id),
    eventType: "mapping_unlinked",
    matchMethod: mapping.match_method ? String(mapping.match_method) : null,
    reviewStatus: "rejected",
    fieldsChanged: [],
    previous: {},
    next: {},
    actorId: input.actorId,
    success: true,
    message: "The Zoho mapping was removed. Customer, site, asset and job rows were not deleted.",
  });
  return { ok: true };
}

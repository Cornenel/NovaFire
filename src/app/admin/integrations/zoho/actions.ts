"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveAdmin } from "@/lib/integrations/zoho/access";
import {
  disconnectConnection,
  getConnection,
  markConnectionTest,
  replaceOrganizations,
  selectOrganization,
} from "@/lib/integrations/zoho/connection";
import { listEstimates, listInvoices, listItems } from "@/lib/integrations/zoho/documents";
import { listOrganizations } from "@/lib/integrations/zoho/organizations";
import {
  applyCustomerDecisions,
  rematchCustomerPreview,
  runCustomerPreview,
  saveReviewDecision,
  unlinkMapping,
} from "@/lib/integrations/zoho/sync";
import { getValidAccessToken } from "@/lib/integrations/zoho/tokens";
import { createAdminClient } from "@/lib/supabase/admin";

function go(path: string, notice: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}notice=${notice}`);
}

async function adminContext() {
  const auth = await requireActiveAdmin();
  if (!auth.ok) go("/admin/integrations/zoho", "forbidden");
  return auth;
}

export async function selectZohoOrganization(formData: FormData) {
  const auth = await adminContext();
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const result = await selectOrganization(organizationId);
  revalidatePath("/admin/integrations/zoho");
  go("/admin/integrations/zoho", result.ok ? "org" : "org_failed");
}

export async function testZohoConnection() {
  await adminContext();
  const connection = await getConnection();
  if (!connection?.organization_id) go("/admin/integrations/zoho", "org_required");
  const token = await getValidAccessToken(connection.id);
  if (!token.ok) {
    await markConnectionTest(false, "Zoho Books access needs to be connected again.");
    go("/admin/integrations/zoho", token.revoked ? "revoked_remote" : "test_failed");
  }
  const organizations = await listOrganizations({
    apiDomain: token.apiDomain,
    accessToken: token.accessToken,
  });
  if (!organizations.ok) {
    await markConnectionTest(false, organizations.error);
    go("/admin/integrations/zoho", "test_failed");
  }
  const selected = organizations.organizations.find(
    (organization) => organization.organizationId === connection.organization_id
  );
  if (!selected) {
    await markConnectionTest(false, "The selected organisation was not returned by Zoho Books.");
    go("/admin/integrations/zoho", "test_failed");
  }
  await markConnectionTest(true);
  revalidatePath("/admin/integrations/zoho");
  go("/admin/integrations/zoho", "tested");
}

export async function refreshZohoOrganizations() {
  await adminContext();
  const connection = await getConnection();
  if (!connection) go("/admin/integrations/zoho", "config");
  const token = await getValidAccessToken(connection.id);
  if (!token.ok) go("/admin/integrations/zoho", "test_failed");
  const organizations = await listOrganizations({
    apiDomain: token.apiDomain,
    accessToken: token.accessToken,
  });
  if (!organizations.ok) go("/admin/integrations/zoho", "orgs");
  const saved = await replaceOrganizations(organizations.organizations);
  revalidatePath("/admin/integrations/zoho");
  go("/admin/integrations/zoho", saved.ok ? "orgs_refreshed" : "orgs");
}

export async function disconnectZoho() {
  await adminContext();
  const result = await disconnectConnection();
  revalidatePath("/admin/integrations/zoho");
  go("/admin/integrations/zoho", result.ok ? "disconnected" : "test_failed");
}

export async function startZohoCustomerPreview() {
  const auth = await adminContext();
  const result = await runCustomerPreview({ actorId: auth.userId, supabase: auth.supabase });
  revalidatePath("/admin/integrations/zoho");
  if (!result.ok) {
    if (result.error.includes("already running")) go("/admin/integrations/zoho", "running");
    if (result.error.includes("Test the") || result.error.includes("Select a")) {
      go("/admin/integrations/zoho", "org_required");
    }
    go("/admin/integrations/zoho", "preview_failed");
  }
  redirect(`/admin/integrations/zoho/${result.runId}?notice=preview`);
}

/** One-click: fill missing fields on verified matches + apply saved link/create decisions. */
export async function applyAllZohoChanges(formData: FormData) {
  const auth = await adminContext();
  const runId = String(formData.get("run_id") ?? "");
  const result = await applyCustomerDecisions({
    actorId: auth.userId,
    supabase: auth.supabase,
    runId,
    applyVerified: true,
    applySaved: true,
    applyConflicts: formData.get("apply_conflicts") === "true",
  });
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/integrations/zoho/${runId}`);
  go(`/admin/integrations/zoho/${runId}`, result.ok ? "applied" : "apply_failed");
}

export async function applyVerifiedZohoMatches(formData: FormData) {
  const auth = await adminContext();
  const runId = String(formData.get("run_id") ?? "");
  const result = await applyCustomerDecisions({
    actorId: auth.userId,
    supabase: auth.supabase,
    runId,
    applyVerified: true,
    applySaved: false,
    applyConflicts: formData.get("apply_conflicts") === "true",
  });
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/integrations/zoho/${runId}`);
  go(`/admin/integrations/zoho/${runId}`, result.ok ? "applied" : "apply_failed");
}

function previewPath(runId: string, formData: FormData): string {
  const params = new URLSearchParams();
  const tab = String(formData.get("tab") ?? "");
  const page = String(formData.get("page") ?? "");
  const q = String(formData.get("q") ?? "").trim();
  if (tab && tab !== "all") params.set("tab", tab);
  if (page && page !== "1") params.set("page", page);
  if (q) params.set("q", q);
  const query = params.toString();
  return `/admin/integrations/zoho/${runId}${query ? `?${query}` : ""}`;
}

export async function saveZohoReviewDecision(formData: FormData) {
  const auth = await adminContext();
  const runId = String(formData.get("run_id") ?? "");
  const back = previewPath(runId, formData);
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "link" && decision !== "create_customer" && decision !== "skip" && decision !== "reject") {
    go(back, "decision_failed");
  }
  const customerId =
    String(formData.get("customer_id") ?? "").trim() ||
    String(formData.get("customer_id_manual") ?? "").trim() ||
    null;
  const creating = decision === "create_customer";
  const result = await saveReviewDecision({
    actorId: auth.userId,
    runId,
    itemId: String(formData.get("item_id") ?? ""),
    decision,
    customerId,
    confirmDistinct: creating,
    applyConflicts: formData.get("apply_conflicts") === "true",
  });
  if (!result.ok) {
    revalidatePath(`/admin/integrations/zoho/${runId}`);
    go(back, "decision_failed");
  }
  if (creating) {
    const applied = await applyCustomerDecisions({
      actorId: auth.userId,
      supabase: auth.supabase,
      runId,
      applyVerified: false,
      applySaved: true,
      itemIds: [String(formData.get("item_id") ?? "")],
    });
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/integrations/zoho/${runId}`);
    if (!applied.ok || applied.failed > 0) go(back, "create_blocked");
    go(back, "created");
  }
  revalidatePath(`/admin/integrations/zoho/${runId}`);
  go(back, "decision");
}

export async function rematchZohoPreview(formData: FormData) {
  await adminContext();
  const runId = String(formData.get("run_id") ?? "");
  const back = previewPath(runId, formData);
  const result = await rematchCustomerPreview({ runId });
  revalidatePath(`/admin/integrations/zoho/${runId}`);
  go(back, result.ok ? "rematched" : "rematch_failed");
}

export async function applySavedZohoDecisions(formData: FormData) {
  const auth = await adminContext();
  const runId = String(formData.get("run_id") ?? "");
  const result = await applyCustomerDecisions({
    actorId: auth.userId,
    supabase: auth.supabase,
    runId,
    applyVerified: false,
    applySaved: true,
  });
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/integrations/zoho/${runId}`);
  go(`/admin/integrations/zoho/${runId}`, result.ok ? "applied" : "apply_failed");
}

export async function unlinkZohoCustomer(formData: FormData) {
  const auth = await adminContext();
  const result = await unlinkMapping({
    actorId: auth.userId,
    mappingId: String(formData.get("mapping_id") ?? ""),
  });
  revalidatePath("/admin/integrations/zoho");
  go("/admin/integrations/zoho", result.ok ? "unlinked" : "unlink_failed");
}

export async function refreshZohoDocuments() {
  await adminContext();
  const connection = await getConnection();
  if (!connection?.organization_id || !connection.last_connection_test_ok) {
    go("/admin/integrations/zoho", "org_required");
  }
  const token = await getValidAccessToken(connection.id);
  if (!token.ok || !token.organizationId) go("/admin/integrations/zoho", "test_failed");
  const [items, estimates, invoices] = await Promise.all([
    listItems({
      apiDomain: token.apiDomain,
      accessToken: token.accessToken,
      organizationId: token.organizationId,
    }),
    listEstimates({
      apiDomain: token.apiDomain,
      accessToken: token.accessToken,
      organizationId: token.organizationId,
    }),
    listInvoices({
      apiDomain: token.apiDomain,
      accessToken: token.accessToken,
      organizationId: token.organizationId,
    }),
  ]);
  if (!items.ok || !estimates.ok || !invoices.ok) go("/admin/integrations/zoho", "documents_failed");

  const admin = createAdminClient();
  const { data: mappings } = await admin
    .from("zoho_books_contact_mappings")
    .select("zoho_contact_id, customer_id")
    .eq("organization_id", token.organizationId);
  const customerByContact = new Map(
    (mappings ?? []).map((row) => [String(row.zoho_contact_id), String(row.customer_id)])
  );
  const documents = [...items.documents, ...estimates.documents, ...invoices.documents];
  if (documents.length > 0) {
    const { error } = await admin.from("zoho_books_document_links").upsert(
      documents.map((document) => ({
        organization_id: token.organizationId,
        document_type: document.documentType,
        zoho_document_id: document.zohoDocumentId,
        document_number: document.documentNumber,
        document_status: document.documentStatus,
        document_date: document.documentDate,
        zoho_contact_id: document.zohoContactId,
        contact_name: document.contactName,
        customer_id: document.zohoContactId
          ? customerByContact.get(document.zohoContactId) ?? null
          : null,
        currency_code: document.currencyCode,
        total: document.total,
        financial_writes_enabled: false,
        last_seen_at: new Date().toISOString(),
      })),
      { onConflict: "organization_id,document_type,zoho_document_id" }
    );
    if (error) go("/admin/integrations/zoho", "documents_failed");
  }
  revalidatePath("/admin/integrations/zoho");
  go("/admin/integrations/zoho", "documents");
}

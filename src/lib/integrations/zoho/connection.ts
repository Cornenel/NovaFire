import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashOAuthState } from "./crypto";
import { clearTokens, readRefreshToken, saveTokenSet } from "./tokens";
import { revokeToken, type TokenSet } from "./oauth";
import type { ZohoOrganization } from "./organizations";
import { ZOHO_BOOKS_READ_SCOPES } from "./types";

function admin(): SupabaseClient {
  return createAdminClient();
}

type ConnectionRow = {
  id: string;
  status: string;
  accounts_url: string;
  api_domain: string | null;
  organization_id: string | null;
  organization_name: string | null;
  scopes: string;
  connected_by: string | null;
  connected_at: string | null;
  last_connection_test_at: string | null;
  last_connection_test_ok: boolean | null;
  last_error_code: string | null;
  last_error_message: string | null;
  last_sync_at: string | null;
};

export async function getConnection(): Promise<ConnectionRow | null> {
  const { data, error } = await admin()
    .from("zoho_books_connections")
    .select(
      "id, status, accounts_url, api_domain, organization_id, organization_name, scopes, connected_by, connected_at, last_connection_test_at, last_connection_test_ok, last_error_code, last_error_message, last_sync_at"
    )
    .eq("singleton", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as ConnectionRow;
}

export async function listStoredOrganizations(connectionId: string): Promise<ZohoOrganization[]> {
  const { data, error } = await admin()
    .from("zoho_books_organizations")
    .select("organization_id, name, currency_code, is_default_org")
    .eq("connection_id", connectionId)
    .order("name");
  if (error || !data) return [];
  return data.map((row) => ({
    organizationId: String(row.organization_id),
    name: String(row.name),
    currencyCode: row.currency_code ? String(row.currency_code) : null,
    isDefault: row.is_default_org === true,
  }));
}

export async function issueOAuthState(adminUserId: string, state: string): Promise<void> {
  const now = new Date().toISOString();
  await admin().from("zoho_oauth_states").delete().lt("expires_at", now);
  const { error } = await admin().from("zoho_oauth_states").insert({
    state_hash: hashOAuthState(state),
    admin_user_id: adminUserId,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error("The Zoho connection attempt could not be started.");
}

export async function consumeOAuthState(
  state: string,
  adminUserId: string
): Promise<{ ok: true } | { ok: false; reason: "replay" | "expired" | "mismatch" }> {
  const now = new Date().toISOString();
  const { data, error } = await admin()
    .from("zoho_oauth_states")
    .update({ consumed_at: now })
    .eq("state_hash", hashOAuthState(state))
    .eq("admin_user_id", adminUserId)
    .is("consumed_at", null)
    .gt("expires_at", now)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    const { data: existing } = await admin()
      .from("zoho_oauth_states")
      .select("consumed_at, expires_at, admin_user_id")
      .eq("state_hash", hashOAuthState(state))
      .maybeSingle();
    if (!existing) return { ok: false, reason: "mismatch" };
    if (existing.admin_user_id !== adminUserId) return { ok: false, reason: "mismatch" };
    if (existing.consumed_at) return { ok: false, reason: "replay" };
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

export async function storeAuthorizedConnection(input: {
  actorId: string;
  accountsUrl: string;
  token: TokenSet;
  organizations: ZohoOrganization[];
  organizationError?: string | null;
}): Promise<{ ok: true; connectionId: string } | { ok: false; error: string }> {
  const existing = await getConnection();
  const payload = {
    singleton: true,
    status: "pending_organization",
    accounts_url: input.accountsUrl,
    api_domain: input.token.apiDomain,
    organization_id: null,
    organization_name: null,
    scopes: ZOHO_BOOKS_READ_SCOPES.join(" "),
    connected_by: input.actorId,
    connected_at: new Date().toISOString(),
    last_connection_test_at: null,
    last_connection_test_ok: null,
    last_error_code: null,
    last_error_message:
      input.organizationError ??
      (input.organizations.length === 0 ? "Zoho Books returned no organisations." : null),
  };

  let connectionId = existing?.id ?? "";
  if (existing) {
    const { error } = await admin().from("zoho_books_connections").update(payload).eq("id", existing.id);
    if (error) return { ok: false, error: "The Zoho connection could not be saved." };
    connectionId = existing.id;
    await admin().from("zoho_books_organizations").delete().eq("connection_id", existing.id);
  } else {
    const { data, error } = await admin()
      .from("zoho_books_connections")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "The Zoho connection could not be saved." };
    connectionId = data.id as string;
  }

  const saved = await saveTokenSet({
    connectionId,
    token: input.token,
    previousRefreshToken: null,
  });
  if (!saved.ok) return saved;

  if (input.organizations.length > 0) {
    const { error } = await admin().from("zoho_books_organizations").insert(
      input.organizations.map((organization) => ({
        connection_id: connectionId,
        organization_id: organization.organizationId,
        name: organization.name,
        currency_code: organization.currencyCode,
        is_default_org: organization.isDefault,
      }))
    );
    if (error) return { ok: false, error: "Zoho organisations could not be saved." };
  }

  if (input.organizations.length === 0) {
    await admin()
      .from("zoho_books_connections")
      .update({ status: "error", last_error_code: "no_organization" })
      .eq("id", connectionId);
  }

  return { ok: true, connectionId };
}

export async function selectOrganization(
  organizationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const connection = await getConnection();
  if (!connection || connection.status === "revoked") {
    return { ok: false, error: "Connect Zoho Books before selecting an organisation." };
  }
  const organizations = await listStoredOrganizations(connection.id);
  const selected = organizations.find((organization) => organization.organizationId === organizationId);
  if (!selected) return { ok: false, error: "Select an organisation returned by Zoho Books." };
  const { error } = await admin()
    .from("zoho_books_connections")
    .update({
      organization_id: selected.organizationId,
      organization_name: selected.name,
      status: "connected",
      last_connection_test_at: null,
      last_connection_test_ok: null,
      last_error_code: null,
      last_error_message: null,
    })
    .eq("id", connection.id);
  if (error) return { ok: false, error: "The organisation could not be saved." };
  return { ok: true };
}

export async function markConnectionTest(
  ok: boolean,
  errorMessage?: string
): Promise<void> {
  const connection = await getConnection();
  if (!connection) return;
  await admin()
    .from("zoho_books_connections")
    .update({
      last_connection_test_at: new Date().toISOString(),
      last_connection_test_ok: ok,
      last_error_code: ok ? null : "connection_test",
      last_error_message: ok ? null : (errorMessage ?? "Connection test failed.").slice(0, 300),
      status: ok ? "connected" : connection.status === "revoked" ? "revoked" : "error",
    })
    .eq("id", connection.id);
}

export async function disconnectConnection(): Promise<{ ok: true } | { ok: false; error: string }> {
  const connection = await getConnection();
  if (!connection) return { ok: true };
  const refreshToken = await readRefreshToken(connection.id);
  if (refreshToken) {
    await revokeToken({ accountsUrl: connection.accounts_url, token: refreshToken });
  }
  await clearTokens(connection.id);
  await admin().from("zoho_books_organizations").delete().eq("connection_id", connection.id);
  const { error } = await admin()
    .from("zoho_books_connections")
    .update({
      status: "revoked",
      organization_id: null,
      organization_name: null,
      api_domain: null,
      last_connection_test_ok: false,
      last_error_code: null,
      last_error_message: null,
    })
    .eq("id", connection.id);
  if (error) return { ok: false, error: "Zoho Books could not be disconnected." };
  return { ok: true };
}

export async function replaceOrganizations(
  organizations: ZohoOrganization[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const connection = await getConnection();
  if (!connection) return { ok: false, error: "Connect Zoho Books first." };
  await admin().from("zoho_books_organizations").delete().eq("connection_id", connection.id);
  if (organizations.length === 0) {
    return { ok: false, error: "Zoho Books returned no organisations." };
  }
  const { error } = await admin().from("zoho_books_organizations").insert(
    organizations.map((organization) => ({
      connection_id: connection.id,
      organization_id: organization.organizationId,
      name: organization.name,
      currency_code: organization.currencyCode,
      is_default_org: organization.isDefault,
    }))
  );
  if (error) return { ok: false, error: "Zoho organisations could not be saved." };
  return { ok: true };
}

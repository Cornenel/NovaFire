import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { readZohoConfig } from "./config";
import { decryptSecret, encryptSecret, mergeRefreshToken } from "./crypto";
import { refreshAccessToken, type TokenSet } from "./oauth";

type SecretRow = {
  connection_id: string;
  access_token_ciphertext: string | null;
  access_token_expires_at: string | null;
  refresh_token_ciphertext: string | null;
  token_version: number;
};

type ConnectionRow = {
  id: string;
  status: string;
  accounts_url: string;
  api_domain: string | null;
  organization_id: string | null;
};

const REFRESH_SKEW_MS = 60_000;

function admin(): SupabaseClient {
  return createAdminClient();
}

export async function saveTokenSet(input: {
  connectionId: string;
  token: TokenSet;
  previousRefreshToken?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = readZohoConfig();
  if (!config.ok) return { ok: false, error: "Zoho Books encryption is not configured." };
  const refreshToken = mergeRefreshToken(input.previousRefreshToken ?? null, input.token.refreshToken);
  if (!refreshToken) return { ok: false, error: "Zoho did not return a refresh token." };
  const expiresAt = new Date(Date.now() + input.token.expiresIn * 1000).toISOString();
  const { error } = await admin().from("zoho_books_token_secrets").upsert({
    connection_id: input.connectionId,
    access_token_ciphertext: encryptSecret(input.token.accessToken, config.config.encryptionKey),
    access_token_expires_at: expiresAt,
    refresh_token_ciphertext: encryptSecret(refreshToken, config.config.encryptionKey),
    token_version: 1,
  });
  if (error) return { ok: false, error: "The Zoho token could not be stored." };
  return { ok: true };
}

async function loadSecret(connectionId: string): Promise<SecretRow | null> {
  const { data, error } = await admin()
    .from("zoho_books_token_secrets")
    .select(
      "connection_id, access_token_ciphertext, access_token_expires_at, refresh_token_ciphertext, token_version"
    )
    .eq("connection_id", connectionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as SecretRow;
}

async function loadConnection(connectionId: string): Promise<ConnectionRow | null> {
  const { data, error } = await admin()
    .from("zoho_books_connections")
    .select("id, status, accounts_url, api_domain, organization_id")
    .eq("id", connectionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ConnectionRow;
}

function tokenStillValid(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - REFRESH_SKEW_MS > Date.now();
}

export async function getValidAccessToken(
  connectionId: string,
  fetchImpl?: typeof fetch
): Promise<
  | { ok: true; accessToken: string; apiDomain: string; organizationId: string | null }
  | { ok: false; error: string; revoked?: boolean }
> {
  const config = readZohoConfig();
  if (!config.ok) return { ok: false, error: "Zoho Books is not configured on this server." };
  const connection = await loadConnection(connectionId);
  const secret = await loadSecret(connectionId);
  if (!connection || !secret || connection.status === "revoked") {
    return { ok: false, error: "Zoho Books is not connected.", revoked: true };
  }
  if (!connection.api_domain) {
    return { ok: false, error: "Zoho Books did not return a recognised API domain." };
  }
  if (
    secret.access_token_ciphertext &&
    tokenStillValid(secret.access_token_expires_at)
  ) {
    try {
      return {
        ok: true,
        accessToken: decryptSecret(secret.access_token_ciphertext, config.config.encryptionKey),
        apiDomain: connection.api_domain,
        organizationId: connection.organization_id,
      };
    } catch {
      return { ok: false, error: "The stored Zoho access token could not be read." };
    }
  }
  if (!secret.refresh_token_ciphertext) {
    return { ok: false, error: "Zoho Books access has been revoked.", revoked: true };
  }

  let refreshToken = "";
  try {
    refreshToken = decryptSecret(secret.refresh_token_ciphertext, config.config.encryptionKey);
  } catch {
    return { ok: false, error: "The stored Zoho refresh token could not be read." };
  }

  const refreshed = await refreshAccessToken({
    config: config.config,
    accountsUrl: connection.accounts_url,
    refreshToken,
    fetchImpl,
  });
  if (!refreshed.ok) {
    if (refreshed.error.includes("invalid_code") || refreshed.error.includes("invalid_client")) {
      await admin()
        .from("zoho_books_connections")
        .update({
          status: "error",
          last_error_code: "revoked",
          last_error_message: "Zoho Books access needs to be connected again.",
        })
        .eq("id", connectionId);
      return { ok: false, error: "Zoho Books access needs to be connected again.", revoked: true };
    }
    return { ok: false, error: refreshed.error };
  }

  const nextRefresh = mergeRefreshToken(refreshToken, refreshed.token.refreshToken);
  const expiresAt = new Date(Date.now() + refreshed.token.expiresIn * 1000).toISOString();
  const { data: updated, error } = await admin()
    .from("zoho_books_token_secrets")
    .update({
      access_token_ciphertext: encryptSecret(refreshed.token.accessToken, config.config.encryptionKey),
      access_token_expires_at: expiresAt,
      refresh_token_ciphertext: nextRefresh
        ? encryptSecret(nextRefresh, config.config.encryptionKey)
        : secret.refresh_token_ciphertext,
      token_version: secret.token_version + 1,
    })
    .eq("connection_id", connectionId)
    .eq("token_version", secret.token_version)
    .select("token_version")
    .maybeSingle();

  if (error) return { ok: false, error: "The refreshed Zoho token could not be stored." };
  if (!updated) {
    const raced = await loadSecret(connectionId);
    if (raced?.access_token_ciphertext && tokenStillValid(raced.access_token_expires_at)) {
      return {
        ok: true,
        accessToken: decryptSecret(raced.access_token_ciphertext, config.config.encryptionKey),
        apiDomain: connection.api_domain,
        organizationId: connection.organization_id,
      };
    }
    return { ok: false, error: "The Zoho token was refreshed by another request. Try again." };
  }

  if (refreshed.token.apiDomain !== connection.api_domain) {
    await admin()
      .from("zoho_books_connections")
      .update({ api_domain: refreshed.token.apiDomain })
      .eq("id", connectionId);
  }

  return {
    ok: true,
    accessToken: refreshed.token.accessToken,
    apiDomain: refreshed.token.apiDomain,
    organizationId: connection.organization_id,
  };
}

export async function clearTokens(connectionId: string): Promise<void> {
  await admin()
    .from("zoho_books_token_secrets")
    .update({
      access_token_ciphertext: null,
      access_token_expires_at: null,
      refresh_token_ciphertext: null,
      token_version: 1,
    })
    .eq("connection_id", connectionId);
}

export async function readRefreshToken(connectionId: string): Promise<string | null> {
  const config = readZohoConfig();
  if (!config.ok) return null;
  const secret = await loadSecret(connectionId);
  if (!secret?.refresh_token_ciphertext) return null;
  try {
    return decryptSecret(secret.refresh_token_ciphertext, config.config.encryptionKey);
  } catch {
    return null;
  }
}

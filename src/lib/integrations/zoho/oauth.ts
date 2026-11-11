import { isAllowedApiDomain, normalizeOrigin, type ZohoConfig } from "./config";
import { sanitizeExternalError } from "./crypto";

export const OAUTH_STATE_COOKIE = "zoho_oauth_state";
export const OAUTH_STATE_MAX_AGE_SECONDS = 600;

export type TokenSet = {
  accessToken: string;
  refreshToken: string | null;
  apiDomain: string;
  expiresIn: number;
};

export type OAuthStateRecord = {
  adminUserId: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

export function buildAuthorizationUrl(config: ZohoConfig, state: string): string {
  const url = new URL("/oauth/v2/auth", config.accountsUrl);
  url.searchParams.set("scope", config.scopes.join(","));
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export function evaluateOAuthState(input: {
  queryState: string | null;
  cookieState: string | null;
  record: OAuthStateRecord | null;
  currentUserId: string;
  now: Date;
  statesMatch: boolean;
}): { ok: true } | { ok: false; reason: "mismatch" | "expired" | "replay" | "missing" } {
  if (!input.queryState || !input.cookieState || !input.record) {
    return { ok: false, reason: "missing" };
  }
  if (!input.statesMatch || input.record.adminUserId !== input.currentUserId) {
    return { ok: false, reason: "mismatch" };
  }
  if (input.record.consumedAt) return { ok: false, reason: "replay" };
  if (input.record.expiresAt.getTime() <= input.now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

export function parseTokenResponse(
  body: unknown
): { ok: true; token: TokenSet } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: sanitizeExternalError(502) };
  }
  const record = body as Record<string, unknown>;
  if (typeof record.error === "string") {
    return { ok: false, error: sanitizeExternalError(400, record.error) };
  }
  const accessToken = typeof record.access_token === "string" ? record.access_token.trim() : "";
  const refreshToken =
    typeof record.refresh_token === "string" && record.refresh_token.trim()
      ? record.refresh_token.trim()
      : null;
  const apiDomain = typeof record.api_domain === "string" ? record.api_domain.trim() : "";
  const expiresIn = Number(record.expires_in);
  if (!accessToken || !apiDomain || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return { ok: false, error: sanitizeExternalError(502) };
  }
  if (!isAllowedApiDomain(apiDomain)) {
    return { ok: false, error: "region" };
  }
  return {
    ok: true,
    token: {
      accessToken,
      refreshToken,
      apiDomain: normalizeOrigin(apiDomain),
      expiresIn,
    },
  };
}

function tokenEndpoint(accountsUrl: string, params: URLSearchParams): string {
  const url = new URL("/oauth/v2/token", accountsUrl);
  url.search = params.toString();
  return url.toString();
}

async function postToken(
  accountsUrl: string,
  params: URLSearchParams,
  fetchImpl: typeof fetch
): Promise<{ ok: true; token: TokenSet } | { ok: false; error: string }> {
  const endpoint = tokenEndpoint(accountsUrl, params);
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, error: sanitizeExternalError(504) };
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null;
    return { ok: false, error: sanitizeExternalError(response.status, code) };
  }
  return parseTokenResponse(body);
}

export async function exchangeAuthorizationCode(input: {
  config: ZohoConfig;
  accountsUrl: string;
  code: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; token: TokenSet } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    redirect_uri: input.config.redirectUri,
    code: input.code,
  });
  const result = await postToken(input.accountsUrl, params, input.fetchImpl ?? fetch);
  if (!result.ok) return result;
  if (!result.token.refreshToken) {
    return { ok: false, error: sanitizeExternalError(502) };
  }
  return result;
}

export async function refreshAccessToken(input: {
  config: ZohoConfig;
  accountsUrl: string;
  refreshToken: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; token: TokenSet } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    refresh_token: input.refreshToken,
  });
  return postToken(input.accountsUrl, params, input.fetchImpl ?? fetch);
}

export async function revokeToken(input: {
  accountsUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const url = new URL("/oauth/v2/token/revoke", input.accountsUrl);
  url.searchParams.set("token", input.token);
  try {
    await (input.fetchImpl ?? fetch)(url.toString(), {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Local revocation still proceeds when Zoho cannot be reached.
  }
}

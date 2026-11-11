import { isAllowedApiDomain, normalizeOrigin } from "./config";
import { sanitizeExternalError } from "./crypto";

const READ_PATHS = ["/organizations", "/contacts", "/items", "/estimates", "/invoices"];

export type ZohoGetResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; error: string; retryable: boolean };

function allowedPath(path: string): boolean {
  if (!path.startsWith("/") || path.includes("..") || path.includes("://")) return false;
  const [base] = path.split("?");
  return READ_PATHS.some(
    (prefix) => base === prefix || base.startsWith(`${prefix}/`)
  );
}

export async function zohoBooksGet(input: {
  apiDomain: string;
  accessToken: string;
  path: string;
  query?: Record<string, string | number | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<ZohoGetResult> {
  if (!isAllowedApiDomain(input.apiDomain) || !allowedPath(input.path)) {
    return {
      ok: false,
      status: 400,
      error: "Zoho Books request was rejected before it was sent.",
      retryable: false,
    };
  }
  const url = new URL(`/books/v3${input.path}`, normalizeOrigin(input.apiDomain));
  for (const [key, value] of Object.entries(input.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  let attempt = 0;
  while (attempt < 3) {
    attempt += 1;
    let response: Response;
    try {
      response = await (input.fetchImpl ?? fetch)(url, {
        method: "GET",
        headers: {
          Authorization: `Zoho-oauthtoken ${input.accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      return { ok: false, status: 504, error: sanitizeExternalError(504), retryable: true };
    }

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 5000)
        : attempt * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (!response.ok) {
      const code =
        body && typeof body === "object" && "code" in body
          ? (body as { code: unknown }).code
          : null;
      return {
        ok: false,
        status: response.status,
        error: sanitizeExternalError(
          response.status,
          typeof code === "number" || typeof code === "string" ? code : null
        ),
        retryable: response.status === 429 || response.status >= 500,
      };
    }
    if (body && typeof body === "object" && "code" in body) {
      const code = (body as { code: unknown }).code;
      if (typeof code === "number" && code !== 0) {
        return {
          ok: false,
          status: response.status,
          error: sanitizeExternalError(response.status, code),
          retryable: false,
        };
      }
    }
    return { ok: true, body };
  }

  return { ok: false, status: 429, error: sanitizeExternalError(429), retryable: true };
}

export const zohoBooksReadOperations = [
  "listOrganizations",
  "listContacts",
  "getContact",
  "listItems",
  "listEstimates",
  "listInvoices",
] as const;

import { ZOHO_BOOKS_READ_SCOPES } from "./types";

const ACCOUNTS_HOSTS = new Set([
  "accounts.zoho.com",
  "accounts.zoho.eu",
  "accounts.zoho.in",
  "accounts.zoho.com.au",
  "accounts.zoho.jp",
  "accounts.zohocloud.ca",
  "accounts.zoho.ca",
  "accounts.zoho.sa",
  "accounts.zoho.uk",
  "accounts.zoho.com.cn",
]);

const API_ORIGINS = new Set([
  "https://www.zohoapis.com",
  "https://www.zohoapis.eu",
  "https://www.zohoapis.in",
  "https://www.zohoapis.com.au",
  "https://www.zohoapis.jp",
  "https://www.zohoapis.ca",
  "https://www.zohoapis.sa",
  "https://www.zohoapis.uk",
  "https://www.zohoapis.com.cn",
]);

const LOCATION_ACCOUNTS: Record<string, string> = {
  us: "https://accounts.zoho.com",
  eu: "https://accounts.zoho.eu",
  in: "https://accounts.zoho.in",
  au: "https://accounts.zoho.com.au",
  jp: "https://accounts.zoho.jp",
  ca: "https://accounts.zohocloud.ca",
  sa: "https://accounts.zoho.sa",
  uk: "https://accounts.zoho.uk",
  cn: "https://accounts.zoho.com.cn",
};

export type ZohoConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accountsUrl: string;
  encryptionKey: Buffer;
  scopes: readonly string[];
};

export type ZohoEnvStatus = {
  clientId: boolean;
  clientSecret: boolean;
  redirectUri: boolean;
  accountsUrl: boolean;
  encryptionKey: boolean;
  redirectUriValid: boolean;
  redirectUriValue: string;
  redirectUriProblem: string | null;
  redirectUriUpgradedFromHttp: boolean;
  accountsUrlValid: boolean;
  encryptionKeyValid: boolean;
  missing: string[];
};

function serverEnv(name: keyof ReturnType<typeof directEnv>): string {
  return cleanEnvValue(directEnv()[name] ?? "");
}

function directEnv() {
  return {
    ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
    ZOHO_REDIRECT_URI: process.env.ZOHO_REDIRECT_URI,
    ZOHO_ACCOUNTS_URL: process.env.ZOHO_ACCOUNTS_URL,
    ZOHO_TOKEN_ENCRYPTION_KEY: process.env.ZOHO_TOKEN_ENCRYPTION_KEY,
  };
}

export function cleanEnvValue(value: string | undefined): string {
  return (value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .trim();
}

export function zohoEnvironmentStatus(): ZohoEnvStatus {
  const clientId = serverEnv("ZOHO_CLIENT_ID");
  const clientSecret = serverEnv("ZOHO_CLIENT_SECRET");
  const redirectUri = serverEnv("ZOHO_REDIRECT_URI");
  const accountsUrl = serverEnv("ZOHO_ACCOUNTS_URL");
  const encryptionKey = serverEnv("ZOHO_TOKEN_ENCRYPTION_KEY");
  const redirect = inspectRedirectUri(redirectUri);
  const accountsUrlValid = isAllowedAccountsUrl(accountsUrl);
  const encryptionKeyValid = decodeEncryptionKey(encryptionKey).ok;
  const missing: string[] = [];
  if (!clientId) missing.push("ZOHO_CLIENT_ID");
  if (!clientSecret) missing.push("ZOHO_CLIENT_SECRET");
  if (!redirectUri) missing.push("ZOHO_REDIRECT_URI");
  if (!accountsUrl) missing.push("ZOHO_ACCOUNTS_URL");
  if (!encryptionKey) missing.push("ZOHO_TOKEN_ENCRYPTION_KEY");
  return {
    clientId: Boolean(clientId),
    clientSecret: Boolean(clientSecret),
    redirectUri: Boolean(redirectUri),
    accountsUrl: Boolean(accountsUrl),
    encryptionKey: Boolean(encryptionKey),
    redirectUriValid: redirect.valid,
    redirectUriValue: redirect.normalized ?? redirectUri,
    redirectUriProblem: redirect.problem,
    redirectUriUpgradedFromHttp: redirect.upgradedFromHttp,
    accountsUrlValid,
    encryptionKeyValid,
    missing,
  };
}

export function readZohoConfig(): { ok: true; config: ZohoConfig } | { ok: false; missing: string[] } {
  const status = zohoEnvironmentStatus();
  if (
    status.missing.length > 0 ||
    !status.redirectUriValid ||
    !status.accountsUrlValid ||
    !status.encryptionKeyValid
  ) {
    const missing = [...status.missing];
    if (status.redirectUri && !status.redirectUriValid) missing.push("ZOHO_REDIRECT_URI");
    if (status.accountsUrl && !status.accountsUrlValid) missing.push("ZOHO_ACCOUNTS_URL");
    if (status.encryptionKey && !status.encryptionKeyValid) {
      missing.push("ZOHO_TOKEN_ENCRYPTION_KEY");
    }
    return { ok: false, missing: [...new Set(missing)] };
  }

  const decoded = decodeEncryptionKey(serverEnv("ZOHO_TOKEN_ENCRYPTION_KEY"));
  if (!decoded.ok) return { ok: false, missing: ["ZOHO_TOKEN_ENCRYPTION_KEY"] };
  const redirect = inspectRedirectUri(serverEnv("ZOHO_REDIRECT_URI"));
  if (!redirect.valid || !redirect.normalized) {
    return { ok: false, missing: ["ZOHO_REDIRECT_URI"] };
  }

  return {
    ok: true,
    config: {
      clientId: serverEnv("ZOHO_CLIENT_ID"),
      clientSecret: serverEnv("ZOHO_CLIENT_SECRET"),
      redirectUri: redirect.normalized,
      accountsUrl: normalizeOrigin(serverEnv("ZOHO_ACCOUNTS_URL")),
      encryptionKey: decoded.key,
      scopes: ZOHO_BOOKS_READ_SCOPES,
    },
  };
}

export function inspectRedirectUri(value: string): {
  valid: boolean;
  normalized: string | null;
  problem: string | null;
  upgradedFromHttp: boolean;
} {
  const cleaned = cleanEnvValue(value);
  if (!cleaned) {
    return {
      valid: false,
      normalized: null,
      problem: "ZOHO_REDIRECT_URI has no value.",
      upgradedFromHttp: false,
    };
  }
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    return {
      valid: false,
      normalized: null,
      problem: "ZOHO_REDIRECT_URI is not a URL.",
      upgradedFromHttp: false,
    };
  }
  const upgradedFromHttp = url.protocol === "http:";
  if (!upgradedFromHttp && url.protocol !== "https:") {
    return {
      valid: false,
      normalized: null,
      problem: "ZOHO_REDIRECT_URI must start with https://.",
      upgradedFromHttp: false,
    };
  }
  if (url.username || url.password) {
    return {
      valid: false,
      normalized: null,
      problem: "ZOHO_REDIRECT_URI must not include a username or password.",
      upgradedFromHttp: false,
    };
  }
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/api/integrations/zoho/callback") {
    return {
      valid: false,
      normalized: null,
      problem: `The path is ${path}. Zoho must use /api/integrations/zoho/callback.`,
      upgradedFromHttp: false,
    };
  }
  url.protocol = "https:";
  url.hash = "";
  url.search = "";
  url.pathname = path;
  return { valid: true, normalized: url.toString(), problem: null, upgradedFromHttp };
}

export function isValidRedirectUri(value: string): boolean {
  return inspectRedirectUri(value).valid;
}

export function isAllowedAccountsUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ACCOUNTS_HOSTS.has(url.hostname) && url.pathname.replace(/\/+$/, "") === "" && url.search === "" && url.hash === "";
  } catch {
    return false;
  }
}

export function normalizeOrigin(value: string): string {
  const url = new URL(value);
  return url.origin;
}

export function isAllowedApiDomain(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    const origin = url.origin;
    return url.protocol === "https:" && API_ORIGINS.has(origin) && (url.pathname === "/" || url.pathname === "");
  } catch {
    return false;
  }
}

export function resolveAccountsServer(input: {
  configuredAccountsUrl: string;
  accountsServer: string | null;
  location: string | null;
}): { ok: true; accountsUrl: string } | { ok: false; error: "region" } {
  const candidates = [
    input.accountsServer?.trim() ?? "",
    input.location ? LOCATION_ACCOUNTS[input.location.trim().toLowerCase()] ?? "" : "",
    input.configuredAccountsUrl,
  ];
  for (const candidate of candidates) {
    if (candidate && isAllowedAccountsUrl(candidate)) {
      return { ok: true, accountsUrl: normalizeOrigin(candidate) };
    }
  }
  return { ok: false, error: "region" };
}

export function decodeEncryptionKey(
  value: string
): { ok: true; key: Buffer } | { ok: false } {
  if (!value) return { ok: false };
  try {
    const key = Buffer.from(value, "base64url");
    if (key.length !== 32) return { ok: false };
    return { ok: true, key };
  } catch {
    return { ok: false };
  }
}

export function adminAccessDecision(
  userId: string | null,
  profile: { role: string; is_active: boolean } | null
): "ok" | "unauthenticated" | "forbidden" {
  if (!userId) return "unauthenticated";
  if (!profile?.is_active || profile.role !== "admin") return "forbidden";
  return "ok";
}

export const COOKIE_CONSENT_STORAGE_KEY = "nf_cookie_consent";

export type CookieConsentLevel = "essential" | "all";

export function isCookieConsentLevel(v: string | null): v is CookieConsentLevel {
  return v === "essential" || v === "all";
}

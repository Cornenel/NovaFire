/** Canonical public site origin — keep www everywhere for SEO consistency. */
export const SITE_URL = "https://www.novafire.co.za";

export const SITE_NAME = "Nova Fire";

export const PRIMARY_PHONE = "+27662700293";
export const PRIMARY_PHONE_DISPLAY = "066 270 0293";
export const PRIMARY_EMAIL = "jacques@novafire.co.za";

export const SERVICE_PROVINCES = ["Mpumalanga", "Limpopo"] as const;

/** Verified business NAP for LocalBusiness / contact pages. */
export const BUSINESS_ADDRESS = {
  streetAddress: "Plot 85 Cromdale, Barberton Road R40",
  addressLocality: "Mbombela",
  addressRegion: "Mpumalanga",
  postalCode: "1207",
  addressCountry: "ZA",
} as const;

export const BUSINESS_ADDRESS_DISPLAY =
  "Plot 85 Cromdale, Barberton Road R40, Mbombela, 1207";

export const BUSINESS_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(BUSINESS_ADDRESS_DISPLAY);

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

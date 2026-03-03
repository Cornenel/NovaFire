/**
 * Zoho Forms – Lazy Load Utility
 *
 * INTEGRATION: Use this to dynamically inject Zoho Forms scripts when the form
 * container enters the viewport. Prevents blocking render and improves Core Web Vitals.
 *
 * Env vars (recommended):
 * - NEXT_PUBLIC_ZOHO_FORM_COMPLIANCE_ID
 * - NEXT_PUBLIC_ZOHO_FORM_QUOTE_ID
 * - NEXT_PUBLIC_ZOHO_FORM_TRAINING_ID
 * etc.
 */

export type ZohoFormType =
  | "compliance"
  | "quote"
  | "training"
  | "emergency"
  | "payment"
  | "asset"
  | "jobcard"
  | "cylinder"
  | "vehicle"
  | "equipment";

/** Placeholder form IDs – replace with env vars in production */
const FORM_IDS: Record<ZohoFormType, string> = {
  compliance: process.env.NEXT_PUBLIC_ZOHO_FORM_COMPLIANCE_ID || "COMPLIANCE_FORM_ID",
  quote: process.env.NEXT_PUBLIC_ZOHO_FORM_QUOTE_ID || "QUOTE_FORM_ID",
  training: process.env.NEXT_PUBLIC_ZOHO_FORM_TRAINING_ID || "TRAINING_FORM_ID",
  emergency: process.env.NEXT_PUBLIC_ZOHO_FORM_EMERGENCY_ID || "EMERGENCY_FORM_ID",
  payment: process.env.NEXT_PUBLIC_ZOHO_FORM_PAYMENT_ID || "PAYMENT_FORM_ID",
  asset: process.env.NEXT_PUBLIC_ZOHO_FORM_ASSET_ID || "ASSET_FORM_ID",
  jobcard: process.env.NEXT_PUBLIC_ZOHO_FORM_JOBCARD_ID || "JOBCARD_FORM_ID",
  cylinder: process.env.NEXT_PUBLIC_ZOHO_FORM_CYLINDER_ID || "CYLINDER_FORM_ID",
  vehicle: process.env.NEXT_PUBLIC_ZOHO_FORM_VEHICLE_ID || "VEHICLE_FORM_ID",
  equipment: process.env.NEXT_PUBLIC_ZOHO_FORM_EQUIPMENT_ID || "EQUIPMENT_FORM_ID",
};

/**
 * Returns the Zoho form embed URL for a given form type.
 * Configure in .env.local for production.
 */
export function getZohoFormId(type: ZohoFormType): string {
  return FORM_IDS[type];
}

/**
 * Dynamically loads a Zoho Forms script into the page.
 * Call when the form container becomes visible (e.g. from ZohoFormEmbed).
 */
export function loadZohoFormScript(
  formId: string,
  containerId: string,
  scriptUrl?: string
): void {
  if (typeof window === "undefined") return;

  const existing = document.querySelector(`script[data-zoho-form="${formId}"]`);
  if (existing) return;

  // Zoho Forms typically use a URL like:
  // https://forms.zohopublic.com/.../form/perma/xxxxx
  const url =
    scriptUrl ||
    `https://forms.zohopublic.com/form/perma/${formId}`;

  const script = document.createElement("script");
  script.setAttribute("data-zoho-form", formId);
  script.src = url;
  script.async = true;
  script.onload = () => {
    // Zoho scripts often expect a container – ensure it exists
    const container = document.getElementById(containerId);
    if (container) {
      container.setAttribute("aria-busy", "false");
    }
  };
  document.body.appendChild(script);
}

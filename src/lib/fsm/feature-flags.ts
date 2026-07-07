/**
 * Phase 5 feature flags.
 *
 * Every Phase 5 feature is additive and individually switchable. Flags
 * default to ON; set the env var to "false" to disable a feature without
 * code changes (works in .env.local and per-environment on the host).
 *
 * NEXT_PUBLIC_ prefix makes flags available to both server and client
 * components. References are static so Next.js can inline them.
 */

export const featureFlags = {
  /** F1: Smart asset insights panel on the asset screen */
  assetInsights: process.env.NEXT_PUBLIC_FF_ASSET_INSIGHTS !== "false",
  /** F2: Voice notes (speech-to-text) on inspection/defect note fields */
  voiceNotes: process.env.NEXT_PUBLIC_FF_VOICE_NOTES !== "false",
  /** F3: Defect recommendations when a defect type is selected */
  defectRecommendations:
    process.env.NEXT_PUBLIC_FF_DEFECT_RECOMMENDATIONS !== "false",
  /** F4: Auto service recommendations after inspections / at sign-off */
  serviceRecommendations:
    process.env.NEXT_PUBLIC_FF_SERVICE_RECOMMENDATIONS !== "false",
  /** F5: Customer compliance score per site */
  complianceScore: process.env.NEXT_PUBLIC_FF_COMPLIANCE_SCORE !== "false",
  /** F6: Admin compliance dashboard */
  complianceDashboard:
    process.env.NEXT_PUBLIC_FF_COMPLIANCE_DASHBOARD !== "false",
  /** F7: Defect-to-quote staging area */
  quotePreparation: process.env.NEXT_PUBLIC_FF_QUOTE_PREPARATION !== "false",
  /** F8: Revenue opportunity detection */
  revenueOpportunities:
    process.env.NEXT_PUBLIC_FF_REVENUE_OPPORTUNITIES !== "false",
  /** Phase 2: Customer portal (read-only client access) */
  customerPortal: process.env.NEXT_PUBLIC_FF_CUSTOMER_PORTAL !== "false",
} as const;

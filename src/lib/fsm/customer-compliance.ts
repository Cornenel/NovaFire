import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateComplianceScore,
  type ComplianceResult,
} from "@/lib/fsm/compliance";
import { countComplianceFireRisks } from "@/lib/fsm/fire-risks";
import type { Asset } from "@/lib/fsm/types";

export async function loadCustomerCompliance(
  supabase: SupabaseClient,
  customerId: string
): Promise<ComplianceResult | null> {
  const { data: sites } = await supabase
    .from("sites")
    .select("id")
    .eq("customer_id", customerId);

  const siteIds = (sites ?? []).map((s) => s.id);
  if (siteIds.length === 0) return null;

  const [{ data: assets }, { count: openDefects }, { data: fireRisks }] =
    await Promise.all([
      supabase
        .from("assets")
        .select(
          "status, next_service_date, asset_type, location_description, size_capacity, asset_medium, calculated_compliance_status, annual_service_due_date, pressure_test_due_date, site_id"
        )
        .in("site_id", siteIds),
      supabase
        .from("defects")
        .select("id, asset:assets!inner(site_id)", { count: "exact", head: true })
        .eq("status", "open")
        .in("asset.site_id", siteIds),
      supabase
        .from("fire_risks")
        .select("severity, status")
        .eq("customer_id", customerId),
    ]);

  const riskCounts = countComplianceFireRisks(
    (fireRisks ?? []) as Array<{ severity: "low" | "medium" | "high" | "critical"; status: "open" | "in_progress" | "resolved" | "accepted_risk" }>
  );

  return calculateComplianceScore({
    assets: (assets ?? []) as Asset[],
    openDefects: openDefects ?? 0,
    criticalFireRisks: riskCounts.criticalUnresolved,
    unresolvedFireRisks: riskCounts.unresolved,
  });
}

export async function loadSiteCompliance(
  supabase: SupabaseClient,
  siteId: string,
  customerId?: string
): Promise<ComplianceResult | null> {
  const [{ data: assets }, { count: openDefects }, { data: fireRisks }] =
    await Promise.all([
      supabase
        .from("assets")
        .select(
          "status, next_service_date, asset_type, location_description, size_capacity, asset_medium, calculated_compliance_status, annual_service_due_date, pressure_test_due_date"
        )
        .eq("site_id", siteId),
      supabase
        .from("defects")
        .select("id, asset:assets!inner(site_id)", { count: "exact", head: true })
        .eq("status", "open")
        .eq("asset.site_id", siteId),
      supabase
        .from("fire_risks")
        .select("severity, status")
        .eq("site_id", siteId),
    ]);

  const riskCounts = countComplianceFireRisks(
    (fireRisks ?? []) as Array<{ severity: "low" | "medium" | "high" | "critical"; status: "open" | "in_progress" | "resolved" | "accepted_risk" }>
  );

  void customerId;
  if ((assets ?? []).length === 0 && riskCounts.unresolved === 0) return null;

  return calculateComplianceScore({
    assets: (assets ?? []) as Asset[],
    openDefects: openDefects ?? 0,
    criticalFireRisks: riskCounts.criticalUnresolved,
    unresolvedFireRisks: riskCounts.unresolved,
  });
}

export async function loadPortalCompliance(
  supabase: SupabaseClient,
  customerId: string,
  siteScopeId?: string | null
): Promise<ComplianceResult | null> {
  if (siteScopeId) {
    return loadSiteCompliance(supabase, siteScopeId, customerId);
  }
  return loadCustomerCompliance(supabase, customerId);
}

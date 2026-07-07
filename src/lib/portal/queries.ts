import type { PortalSession } from "@/lib/portal/session";
import type { SupabaseClient } from "@supabase/supabase-js";

export function scopedSiteIds(session: PortalSession): string[] | null {
  return session.siteScopeId ? [session.siteScopeId] : null;
}

export async function loadPortalSites(
  supabase: SupabaseClient,
  session: PortalSession
) {
  let query = supabase
    .from("sites")
    .select("id, name, address, contact_person, contact_phone")
    .eq("customer_id", session.customer.id)
    .order("name");

  if (session.siteScopeId) {
    query = query.eq("id", session.siteScopeId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function loadPortalAssets(
  supabase: SupabaseClient,
  session: PortalSession,
  siteId?: string
) {
  const sites = await loadPortalSites(supabase, session);
  const siteIds = siteId
    ? sites.filter((s) => s.id === siteId).map((s) => s.id)
    : sites.map((s) => s.id);

  if (siteIds.length === 0) return [];

  const { data } = await supabase
    .from("assets")
    .select(
      "id, asset_code, customer_asset_number, asset_type, asset_medium, size_capacity, location_description, status, next_service_date, annual_service_due_date, pressure_test_due_date, calculated_compliance_status, site_id, site:sites(name)"
    )
    .in("site_id", siteIds)
    .order("asset_code");

  return data ?? [];
}

export async function loadPortalJobs(
  supabase: SupabaseClient,
  session: PortalSession
) {
  let query = supabase
    .from("jobs")
    .select(
      "id, job_number, job_type, status, scheduled_date, completed_at, site:sites(name)"
    )
    .eq("customer_id", session.customer.id)
    .eq("status", "completed")
    .order("scheduled_date", { ascending: false })
    .limit(100);

  if (session.siteScopeId) {
    query = query.eq("site_id", session.siteScopeId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function loadPortalFireRisks(
  supabase: SupabaseClient,
  session: PortalSession
) {
  let query = supabase
    .from("fire_risks")
    .select(
      "id, risk_type, severity, description, recommended_action, status, location_description, created_at, site:sites(name)"
    )
    .eq("customer_id", session.customer.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (session.siteScopeId) {
    query = query.eq("site_id", session.siteScopeId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function loadPortalDefects(
  supabase: SupabaseClient,
  session: PortalSession
) {
  const assets = await loadPortalAssets(supabase, session);
  const assetIds = assets.map((a) => a.id);
  if (assetIds.length === 0) return [];

  const { data } = await supabase
    .from("defects")
    .select(
      "id, defect_type, severity, description, status, created_at, asset:assets(asset_code, site:sites(name))"
    )
    .in("asset_id", assetIds)
    .order("created_at", { ascending: false })
    .limit(200);

  return data ?? [];
}

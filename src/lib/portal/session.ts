import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { featureFlags } from "@/lib/fsm/feature-flags";
import type { Customer, Profile } from "@/lib/fsm/types";

export interface PortalProfile extends Profile {
  customer_id: string | null;
  portal_site_id: string | null;
  portal_access_enabled: boolean;
  last_portal_login_at: string | null;
}

export interface PortalSession {
  userId: string;
  profile: PortalProfile;
  customer: Customer;
  siteScopeId: string | null;
}

export async function getPortalSession(): Promise<PortalSession | null> {
  if (!featureFlags.customerPortal) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, first_name, last_name, email, phone, role, is_active, customer_id, portal_site_id, portal_access_enabled, last_portal_login_at"
    )
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !profile.is_active ||
    profile.role !== "client" ||
    !profile.portal_access_enabled ||
    !profile.customer_id
  ) {
    return null;
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", profile.customer_id)
    .single();

  if (!customer) return null;

  return {
    userId: user.id,
    profile: profile as PortalProfile,
    customer: customer as Customer,
    siteScopeId: profile.portal_site_id,
  };
}

export async function requirePortalSession(
  loginPath = "/client-portal/login"
): Promise<PortalSession> {
  if (!featureFlags.customerPortal) {
    redirect("/");
  }

  const session = await getPortalSession();
  if (!session) redirect(loginPath);
  return session;
}

/** Records portal visit time (service role – bypasses profile self-update limits). */
export async function touchPortalLogin(userId: string) {
  try {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ last_portal_login_at: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    // Non-blocking telemetry.
  }
}

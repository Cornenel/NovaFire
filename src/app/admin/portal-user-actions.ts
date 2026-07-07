"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireDispatcher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/tech-login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !profile.is_active ||
    !["dispatcher", "admin"].includes(profile.role)
  ) {
    redirect("/tech-restricted");
  }
}

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

function portalErrorRedirect(customerId: string, message: string): never {
  redirect(
    `/admin/customers/${customerId}?portal_error=${encodeURIComponent(message)}`
  );
}

function getConfiguredAdminClient(): ReturnType<typeof createAdminClient> {
  try {
    return createAdminClient();
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Supabase admin client is not configured."
    );
  }
}

export async function invitePortalUser(formData: FormData) {
  await requireDispatcher();

  const customerId = str(formData, "customer_id");
  const email = str(formData, "email").toLowerCase();
  const firstName = str(formData, "first_name");
  const lastName = str(formData, "last_name");
  const portalSiteId = strOrNull(formData, "portal_site_id");

  if (!customerId || !email || !firstName || !lastName) {
    portalErrorRedirect(customerId || "", "Email, first name and last name are required.");
  }

  const admin = getConfiguredAdminClient();

  if (portalSiteId) {
    const { data: site } = await admin
      .from("sites")
      .select("id")
      .eq("id", portalSiteId)
      .eq("customer_id", customerId)
      .maybeSingle();
    if (!site) {
      portalErrorRedirect(customerId, "Selected site does not belong to this customer.");
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        phone: strOrNull(formData, "phone"),
        invited_role: "client",
      },
      redirectTo: `${siteUrl}/auth/set-password`,
    }
  );

  if (error || !invited.user) {
    portalErrorRedirect(
      customerId,
      error?.message?.toLowerCase().includes("invalid api key")
        ? "Portal invites require SUPABASE_SERVICE_ROLE_KEY in the deployment environment."
        : error?.message ?? "Invite failed"
    );
  }

  await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      email,
      phone: strOrNull(formData, "phone"),
      role: "client",
      is_active: true,
      customer_id: customerId,
      portal_site_id: portalSiteId,
      portal_access_enabled: true,
    })
    .eq("id", invited.user.id);

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function setPortalUserAccess(formData: FormData) {
  await requireDispatcher();
  const profileId = str(formData, "profile_id");
  const customerId = str(formData, "customer_id");
  const enabled = str(formData, "enabled") === "true";
  if (!profileId || !customerId) return;

  const admin = getConfiguredAdminClient();
  await admin
    .from("profiles")
    .update({ portal_access_enabled: enabled })
    .eq("id", profileId)
    .eq("customer_id", customerId)
    .eq("role", "client");

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function updatePortalUserSiteScope(formData: FormData) {
  await requireDispatcher();
  const profileId = str(formData, "profile_id");
  const customerId = str(formData, "customer_id");
  const portalSiteId = strOrNull(formData, "portal_site_id");
  if (!profileId || !customerId) return;

  const admin = getConfiguredAdminClient();

  if (portalSiteId) {
    const { data: site } = await admin
      .from("sites")
      .select("id")
      .eq("id", portalSiteId)
      .eq("customer_id", customerId)
      .maybeSingle();
    if (!site) return;
  }

  await admin
    .from("profiles")
    .update({ portal_site_id: portalSiteId })
    .eq("id", profileId)
    .eq("customer_id", customerId)
    .eq("role", "client");

  revalidatePath(`/admin/customers/${customerId}`);
}

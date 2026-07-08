"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildTokenHashConfirmUrl,
  getAuthRedirectUrl,
  inviteRedirectConfigurationError,
} from "@/lib/site-url";

/**
 * Technician management – additive server actions.
 * Existing admin actions (actions.ts) are untouched; job assignment still
 * goes through the existing reassignJob / createJob actions and the single
 * jobs.assigned_to field.
 */

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
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireDispatcher();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active || profile.role !== "admin") {
    redirect("/tech-restricted");
  }

  return { supabase, user };
}

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

function technicianErrorRedirect(message: string): never {
  redirect(`/admin/technicians?error=${encodeURIComponent(message)}`);
}

function technicianSuccessRedirect(message: string, setupLink?: string): never {
  const params = new URLSearchParams({ success: message });
  if (setupLink) params.set("setupLink", setupLink);
  redirect(`/admin/technicians?${params.toString()}`);
}

function getConfiguredAdminClient(): ReturnType<typeof createAdminClient> {
  try {
    return createAdminClient();
  } catch (error) {
    technicianErrorRedirect(
      error instanceof Error
        ? error.message
        : "Supabase admin client is not configured."
    );
  }
}

function inviteErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid api key")) {
    return "Technician invites require SUPABASE_SERVICE_ROLE_KEY in the deployment environment. Use the secret service-role key from the same Supabase project as NEXT_PUBLIC_SUPABASE_URL, then redeploy.";
  }
  if (lower.includes("rate limit") || lower.includes("over_email_send_rate_limit")) {
    return (
      "Supabase email rate limit reached (about 2 emails/hour on the default mail service). " +
      "Wait an hour and try again, or set up custom SMTP in Supabase → Project Settings → Authentication → SMTP Settings " +
      "(e.g. Resend, SendGrid, or your domain mail). Each failed retry counts toward the limit."
    );
  }
  return message;
}

function isAlreadyRegisteredError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("already been registered") ||
    lower.includes("already registered") ||
    lower.includes("user already exists")
  );
}

type StaffProfilePayload = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  vehicle_number: string | null;
  saqcc_number: string | null;
  photo_url: string | null;
  role: "technician" | "admin";
  is_active: boolean;
};

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      throw new Error(error.message);
    }
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

async function saveStaffProfile(
  admin: ReturnType<typeof createAdminClient>,
  profile: StaffProfilePayload
) {
  const { error } = await admin
    .from("profiles")
    .upsert(profile, { onConflict: "id" });
  if (error) {
    technicianErrorRedirect(
      `Staff profile could not be saved: ${error.message}`
    );
  }
}

/**
 * Creates a device-safe password setup link (token_hash). Prefer this over
 * resetPasswordForEmail: PKCE codes from that flow are tied to the admin
 * browser and fail when the technician opens the link on their phone.
 */
async function createStaffSetupLink(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  type: "invite" | "recovery",
  meta?: {
    first_name: string;
    last_name: string;
    full_name: string;
    phone: string | null;
    invited_role: string;
  }
): Promise<{ userId: string; setupLink: string }> {
  const { data, error } = await admin.auth.admin.generateLink({
    type,
    email,
    options: {
      redirectTo: getAuthRedirectUrl("/auth/set-password"),
      ...(meta ? { data: meta } : {}),
    },
  });

  if (error || !data.user || !data.properties?.hashed_token) {
    if (isAlreadyRegisteredError(error?.message)) {
      throw new Error(error?.message ?? "already registered");
    }
    technicianErrorRedirect(
      inviteErrorMessage(error?.message ?? "Could not create password setup link")
    );
  }

  const linkType = type === "invite" ? "invite" : "recovery";
  return {
    userId: data.user.id,
    setupLink: buildTokenHashConfirmUrl(data.properties.hashed_token, linkType),
  };
}

async function recoverExistingStaffAccount(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  profile: StaffProfilePayload
) {
  let existing;
  try {
    existing = await findAuthUserByEmail(admin, email);
  } catch (error) {
    technicianErrorRedirect(
      error instanceof Error
        ? error.message
        : "Could not look up the existing account."
    );
  }

  if (!existing) {
    technicianErrorRedirect(
      "That email already has an auth account but it could not be found. Check Supabase → Authentication → Users."
    );
  }

  await saveStaffProfile(admin, { ...profile, id: existing.id });
  const { setupLink } = await createStaffSetupLink(admin, email, "recovery");

  revalidatePath("/admin/technicians");
  technicianSuccessRedirect(
    `Existing account restored for ${email}. Copy the setup link below and send it on WhatsApp (email links can get burned by scanners).`,
    setupLink
  );
}

/**
 * Create a staff account:
 * 1. Generate an invite link via Supabase Admin (also emails the user).
 * 2. Upsert the profiles row (trigger may also create one).
 * 3. Show a copyable device-safe /auth/confirm link (WhatsApp-safe).
 */
export async function createTechnician(formData: FormData) {
  const role = str(formData, "role") === "admin" ? "admin" : "technician";
  if (role === "admin") {
    await requireAdmin();
  } else {
    await requireDispatcher();
  }

  const email = str(formData, "email").toLowerCase();
  const firstName = str(formData, "first_name");
  const lastName = str(formData, "last_name");
  if (!email || !firstName || !lastName) {
    technicianErrorRedirect("Email, first name and last name are required");
  }

  const inviteConfigError = inviteRedirectConfigurationError();
  if (inviteConfigError) {
    technicianErrorRedirect(inviteConfigError);
  }

  const admin = getConfiguredAdminClient();

  const profilePayload: StaffProfilePayload = {
    id: "",
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`,
    email,
    phone: strOrNull(formData, "phone"),
    vehicle_number: strOrNull(formData, "vehicle_number"),
    saqcc_number: strOrNull(formData, "saqcc_number"),
    photo_url: strOrNull(formData, "photo_url"),
    role,
    is_active: true,
  };

  let setupLink: string;
  try {
    const invited = await createStaffSetupLink(admin, email, "invite", {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      phone: strOrNull(formData, "phone"),
      // Signup trigger only honours non-admin invited roles; upsert applies admin.
      invited_role: role === "admin" ? "technician" : role,
    });
    profilePayload.id = invited.userId;
    setupLink = invited.setupLink;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isAlreadyRegisteredError(message)) {
      await recoverExistingStaffAccount(admin, email, profilePayload);
    }
    technicianErrorRedirect(inviteErrorMessage(message || "Invite failed"));
  }

  await saveStaffProfile(admin, profilePayload);

  revalidatePath("/admin/technicians");
  technicianSuccessRedirect(
    `Invite ready for ${email}. Copy the setup link below and send it on WhatsApp — that is the most reliable way for staff to set a password.`,
    setupLink
  );
}

/** Edit technician profile fields (email is managed by Supabase Auth). */
export async function updateTechnician(formData: FormData) {
  await requireDispatcher();

  const id = str(formData, "id");
  const firstName = str(formData, "first_name");
  const lastName = str(formData, "last_name");
  if (!id || !firstName || !lastName) return;

  const admin = getConfiguredAdminClient();
  await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      phone: strOrNull(formData, "phone"),
      vehicle_number: strOrNull(formData, "vehicle_number"),
      saqcc_number: strOrNull(formData, "saqcc_number"),
      photo_url: strOrNull(formData, "photo_url"),
    })
    .eq("id", id);

  revalidatePath(`/admin/technicians/${id}`);
  revalidatePath("/admin/technicians");
}

/**
 * Activate / deactivate. Deactivation never deletes anything: assigned jobs
 * and history are preserved; the technician simply loses app access and
 * disappears from new-assignment dropdowns (which filter is_active).
 */
export async function setTechnicianActive(id: string, active: boolean) {
  await requireDispatcher();

  const admin = getConfiguredAdminClient();
  await admin.from("profiles").update({ is_active: active }).eq("id", id);

  revalidatePath(`/admin/technicians/${id}`);
  revalidatePath("/admin/technicians");
}

/** Re-send a password setup email and show a device-safe copyable link. */
export async function sendPasswordReset(email: string) {
  await requireDispatcher();

  const inviteConfigError = inviteRedirectConfigurationError();
  if (inviteConfigError) {
    technicianErrorRedirect(inviteConfigError);
  }

  const admin = getConfiguredAdminClient();
  const { setupLink } = await createStaffSetupLink(
    admin,
    email.toLowerCase(),
    "recovery"
  );

  revalidatePath("/admin/technicians");
  technicianSuccessRedirect(
    `Password setup link ready for ${email}. Copy it below and send on WhatsApp.`,
    setupLink
  );
}

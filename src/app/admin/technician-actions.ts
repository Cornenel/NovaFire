"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
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

async function sendStaffPasswordEmail(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl("/auth/set-password"),
  });
  if (error) {
    technicianErrorRedirect(inviteErrorMessage(error.message));
  }
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
  await sendStaffPasswordEmail(email);

  revalidatePath("/admin/technicians");
  redirect(
    `/admin/technicians?success=${encodeURIComponent(
      `Existing account restored for ${email}. A password setup email has been sent.`
    )}`
  );
}

/**
 * Create a staff account:
 * 1. Invite via Supabase Auth (sends invite email – no manual password).
 * 2. The handle_new_user trigger creates the profile.
 * 3. Enrich the profile with the remaining fields.
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

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        phone: strOrNull(formData, "phone"),
        // The signup trigger only honours non-admin invited roles; the
        // service-role profile update below applies admin role after invite.
        invited_role: role === "admin" ? "technician" : role,
      },
      redirectTo: getAuthRedirectUrl("/auth/set-password"),
    }
  );

  if (error || !invited.user) {
    if (isAlreadyRegisteredError(error?.message)) {
      await recoverExistingStaffAccount(admin, email, profilePayload);
    }
    technicianErrorRedirect(inviteErrorMessage(error?.message ?? "Invite failed"));
  }

  profilePayload.id = invited.user.id;
  await saveStaffProfile(admin, profilePayload);

  revalidatePath("/admin/technicians");
  redirect(
    `/admin/technicians?success=${encodeURIComponent(
      `Invite sent to ${email}. They will receive an email to set their password.`
    )}`
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

/** Re-send a password setup / reset email. */
export async function sendPasswordReset(email: string) {
  await requireDispatcher();

  const supabase = await createClient();
  const inviteConfigError = inviteRedirectConfigurationError();
  if (inviteConfigError) {
    technicianErrorRedirect(inviteConfigError);
  }
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl("/auth/set-password"),
  });
}

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
    technicianErrorRedirect(inviteErrorMessage(error?.message ?? "Invite failed"));
  }

  // Enrich profile (created by the signup trigger) with technician fields.
  // Service-role client: bypasses RLS; trigger permits server-side updates.
  await admin
    .from("profiles")
    .update({
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
    })
    .eq("id", invited.user.id);

  revalidatePath("/admin/technicians");
  redirect(`/admin/technicians/${invited.user.id}`);
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

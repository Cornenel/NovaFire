"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  parseAssetFormInput,
  validateAssetFormInput,
} from "@/lib/fsm/create-asset-input";

export type TechActionState = {
  ok: boolean;
  error?: string;
};

async function requireStaff() {
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

  if (!profile?.is_active || !["technician", "dispatcher", "admin"].includes(profile.role)) {
    redirect("/tech-restricted");
  }

  return { supabase, user, role: profile.role };
}

async function assertJobSiteAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  siteId: string,
  userId: string,
  role: string
) {
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, site_id, assigned_to, status")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    throw new Error("Job not found.");
  }
  if (job.site_id !== siteId) {
    throw new Error("This asset does not belong to the job site.");
  }
  if (job.status === "completed" || job.status === "cancelled") {
    throw new Error("This job is already closed.");
  }
  if (role === "technician") {
    if (job.assigned_to !== userId) {
      throw new Error("You are not assigned to this job.");
    }
    if (!["travelling", "on_site", "awaiting_parts"].includes(job.status)) {
      throw new Error("Check in on site before adding equipment.");
    }
  }

  return job;
}

export async function createAssetFromJob(
  _prev: TechActionState,
  formData: FormData
): Promise<TechActionState> {
  const jobId = String(formData.get("job_id") ?? "").trim();
  const input = parseAssetFormInput(formData);
  const validationError = validateAssetFormInput(input);

  if (!jobId) return { ok: false, error: "Missing job reference." };
  if (validationError) return { ok: false, error: validationError };

  try {
    const { supabase, user, role } = await requireStaff();
    await assertJobSiteAccess(supabase, jobId, input.siteId, user.id, role);

    const { data, error } = await supabase
      .from("assets")
      .insert({
        site_id: input.siteId,
        asset_type: input.assetType,
        size_capacity: input.sizeCapacity,
        customer_asset_number: input.customerAssetNumber,
        asset_medium: input.assetMedium,
        serial_number: input.serialNumber,
        location_description: input.locationDescription,
        last_service_date: input.lastServiceDate,
        next_service_date: input.nextServiceDate,
        hydro_test_due_date: input.hydroTestDueDate,
      })
      .select("id, asset_code")
      .single();

    if (error || !data) {
      console.error("[tech] createAssetFromJob failed", error);
      return {
        ok: false,
        error: "Could not register the asset. Check your connection and try again.",
      };
    }

    await supabase.from("asset_events").insert({
      asset_id: data.id,
      technician_id: user.id,
      job_id: jobId,
      event_type: "installed",
      details: { source: "tech_onsite" },
    });

    revalidatePath(`/tech/jobs/${jobId}`);
    revalidatePath(`/admin/sites/${input.siteId}`);
    redirect(`/tech/jobs/${jobId}?asset_added=${encodeURIComponent(data.asset_code)}`);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not register the asset.",
    };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/tech-login");
}

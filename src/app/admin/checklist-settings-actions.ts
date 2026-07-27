"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type SettingsActionState = { ok: boolean; error?: string };

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

  if (!profile?.is_active || !["dispatcher", "admin"].includes(profile.role)) {
    redirect("/tech-restricted");
  }

  return supabase;
}

export async function updateChecklistSettings(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const settingsId = String(formData.get("settings_id") ?? "").trim();
  if (!settingsId) return { ok: false, error: "Missing settings reference." };

  const assetTypes = String(formData.get("asset_types_requiring_checklist") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const supabase = await requireDispatcher();
    const { error } = await supabase
      .from("inspection_checklist_settings")
      .update({
        photos_required_for_all_failures:
          formData.get("photos_required_for_all_failures") === "on",
        customer_acknowledgement_required:
          formData.get("customer_acknowledgement_required") === "on",
        detailed_annexure_enabled: formData.get("detailed_annexure_enabled") === "on",
        allow_unable_to_test: formData.get("allow_unable_to_test") === "on",
        pressure_unit: String(formData.get("pressure_unit") ?? "kPa").trim(),
        flow_unit: String(formData.get("flow_unit") ?? "L/min").trim(),
        asset_types_requiring_checklist: assetTypes,
      })
      .eq("id", settingsId);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/checklist-settings");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save settings." };
  }
}

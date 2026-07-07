"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FireRiskStatus } from "@/lib/fsm/types";

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
    !profile?.is_active ||
    !["dispatcher", "admin"].includes(profile.role)
  ) {
    redirect("/tech-restricted");
  }
}

export async function updateFireRiskStatus(formData: FormData) {
  await requireDispatcher();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as FireRiskStatus;
  if (!id || !["open", "in_progress", "resolved", "accepted_risk"].includes(status)) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("fire_risks")
    .update({
      status,
      resolved_at:
        status === "resolved" || status === "accepted_risk"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", id);

  revalidatePath("/admin/fire-risks");
  revalidatePath("/admin/executive");
  revalidatePath("/client-portal/risks");
}

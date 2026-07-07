"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePortalSession } from "@/lib/portal/session";

export async function approvePortalQuote(formData: FormData) {
  const recommendationId = String(formData.get("id") ?? "");
  if (!recommendationId) return;
  await requirePortalSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("quote_recommendations")
    .update({
      customer_approved_at: new Date().toISOString(),
      customer_rejected_at: null,
    })
    .eq("id", recommendationId);

  if (error) throw new Error(error.message);
  revalidatePath("/client-portal/quotes");
  revalidatePath("/client-portal");
}

export async function rejectPortalQuote(formData: FormData) {
  const recommendationId = String(formData.get("id") ?? "");
  if (!recommendationId) return;
  await requirePortalSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("quote_recommendations")
    .update({
      customer_rejected_at: new Date().toISOString(),
      customer_approved_at: null,
    })
    .eq("id", recommendationId);

  if (error) throw new Error(error.message);
  revalidatePath("/client-portal/quotes");
  revalidatePath("/client-portal");
}

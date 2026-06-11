"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Phase 5 (F7): Defect-to-Quote preparation.
 * New, additive server actions – existing admin actions are untouched.
 * Operates only on the quote_recommendations staging table; never creates
 * actual quotes and never modifies defects.
 */

export async function updateQuoteRecommendationStatus(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !["suggested", "accepted", "dismissed"].includes(status)) return;

  const supabase = await createClient();
  await supabase
    .from("quote_recommendations")
    .update({ status })
    .eq("id", id);

  revalidatePath("/admin/quotes");
}

import { createClient } from "@/lib/supabase/server";
import { adminAccessDecision } from "./config";

export async function requireActiveAdmin(): Promise<
  | {
      ok: true;
      userId: string;
      supabase: Awaited<ReturnType<typeof createClient>>;
    }
  | { ok: false; status: 401 | 403; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Sign in as an active administrator." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();
  const decision = adminAccessDecision(user.id, profile);
  if (decision !== "ok") {
    return { ok: false, status: 403, error: "Only active administrators can use Zoho Books." };
  }
  return { ok: true, userId: user.id, supabase };
}

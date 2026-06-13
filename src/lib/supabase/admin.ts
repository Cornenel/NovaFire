import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client using the service_role key.
 * SERVER ONLY – bypasses RLS. Never import from client components.
 * Used by server actions that insert public (anonymous) form submissions.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the deployment environment."
    );
  }

  if (!serviceRoleKey.startsWith("sb_secret_") && !serviceRoleKey.startsWith("eyJ")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must be the secret service-role key from the same Supabase project as NEXT_PUBLIC_SUPABASE_URL."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

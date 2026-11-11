import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

export type ApiAuthContext = {
  mode: "admin_session" | "ops_api_key";
  user: User | null;
  /** RLS-bound client for session auth, or service-role client for API key. */
  supabase: SupabaseClient;
};

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
}

function getApiKey(request: Request): string | null {
  return (
    request.headers.get("x-api-key")?.trim() ||
    request.headers.get("x-novafire-api-key")?.trim() ||
    null
  );
}

/**
 * Authenticate ops API requests.
 *
 * Accepted:
 * 1. `x-api-key` / `x-novafire-api-key` matching `NOVAFIRE_OPS_API_KEY`
 *    → service-role client (server-only machine access)
 * 2. Supabase user session cookie OR `Authorization: Bearer <access_token>`
 *    → must be an active admin profile
 */
export async function requireOpsApiAuth(
  request: Request
): Promise<{ ctx: ApiAuthContext } | { error: string; status: number }> {
  const configuredKey = process.env.NOVAFIRE_OPS_API_KEY?.trim();
  const providedKey = getApiKey(request);

  if (configuredKey && providedKey && safeEqualString(configuredKey, providedKey)) {
    try {
      return {
        ctx: {
          mode: "ops_api_key",
          user: null,
          supabase: createAdminClient(),
        },
      };
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? err.message
            : "Service role client is not configured.",
        status: 503,
      };
    }
  }

  if (providedKey && !configuredKey) {
    return {
      error:
        "API key auth is not configured. Set NOVAFIRE_OPS_API_KEY in the deployment environment.",
      status: 503,
    };
  }

  if (providedKey && configuredKey) {
    return { error: "Invalid API key.", status: 401 };
  }

  const bearer = getBearerToken(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let supabase: SupabaseClient;
  let user: User | null = null;

  if (bearer && supabaseUrl && anonKey) {
    supabase = createSupabaseClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(bearer);
    if (error || !data.user) {
      return { error: "Invalid or expired access token.", status: 401 };
    }
    user = data.user;
  } else {
    supabase = await createServerClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    if (!sessionUser) {
      return {
        error:
          "Unauthorized. Provide a valid admin session, Bearer access token, or x-api-key.",
        status: 401,
      };
    }
    user = sessionUser;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active || profile.role !== "admin") {
    return {
      error: "Forbidden. Only active admin users can use this API.",
      status: 403,
    };
  }

  return {
    ctx: {
      mode: "admin_session",
      user,
      supabase,
    },
  };
}

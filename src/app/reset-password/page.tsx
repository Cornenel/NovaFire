import { redirect } from "next/navigation";

/**
 * Alias for Supabase / bookmark redirects that expect /reset-password.
 * Query + hash are preserved by the browser when using client redirects;
 * for server-side search params we forward them to set-password.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") sp.set(key, value);
    else if (Array.isArray(value) && value[0]) sp.set(key, value[0]);
  }
  const qs = sp.toString();
  redirect(qs ? `/auth/set-password?${qs}` : "/auth/set-password");
}

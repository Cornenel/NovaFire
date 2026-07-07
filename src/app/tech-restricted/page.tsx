import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

export default async function TechRestrictedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && featureFlags.customerPortal) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, portal_access_enabled, customer_id")
      .eq("id", user.id)
      .single();

    if (
      profile?.is_active &&
      profile.role === "client" &&
      profile.portal_access_enabled &&
      profile.customer_id
    ) {
      redirect("/client-portal");
    }
  }

  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <Navbar />
      <div className="max-w-sm w-full text-center mx-auto flex-1 flex flex-col justify-center py-20 pt-32 px-6">
        <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
          Access Restricted
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          This area is for Nova Fire staff and administrators only.
          {featureFlags.customerPortal
            ? " If you are a customer, use the client portal instead."
            : ""}
        </p>
        {featureFlags.customerPortal ? (
          <Link
            href="/client-portal/login"
            className="text-sm text-red-400 hover:text-red-300 mb-4"
          >
            Go to client portal →
          </Link>
        ) : null}
        <Link
          href="https://novafire.co.za"
          className="text-sm text-zinc-500 hover:text-white transition-colors"
        >
          ← Return to Nova Fire
        </Link>
      </div>
      <SiteFooter variant="compact" />
    </div>
  );
}

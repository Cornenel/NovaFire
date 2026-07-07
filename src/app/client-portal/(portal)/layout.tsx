import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { PortalNav } from "@/components/portal/portal-nav";
import {
  requirePortalSession,
  touchPortalLogin,
} from "@/lib/portal/session";
import { signOut } from "@/app/tech/actions";

export const metadata = {
  title: "Client Portal | Nova Fire",
  description: "View your fire compliance, assets, reports and service history.",
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!featureFlags.customerPortal) {
    redirect("/");
  }

  const session = await requirePortalSession();
  await touchPortalLogin(session.userId);

  return (
    <div className="min-h-screen nf-bg-base">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0c0c0c]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-lg font-bold text-white font-[family-name:var(--font-syne)]">
              Nova<span className="text-red-600">Fire</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
              CLIENT
            </span>
          </div>
          <PortalNav />
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-sm text-zinc-400 truncate max-w-[140px]">
              {session.customer.name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TechBottomNav } from "@/components/tech/bottom-nav";
import { OfflineStatus } from "@/components/tech/offline-status";
import { signOut } from "./actions";

export const metadata = {
  title: "Technician App | Nova Fire",
  description:
    "Daily jobs, asset inspections, QR scanning, defects and service reports.",
};

export default async function TechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/tech-login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .single();

  const isStaff =
    profile &&
    profile.is_active &&
    ["technician", "dispatcher", "admin"].includes(profile.role);

  if (!isStaff) redirect("/tech-restricted");

  const firstName = profile.full_name.split(" ")[0] || "Technician";

  return (
    <div className="min-h-screen nf-bg-base">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0c0c0c]/95 backdrop-blur-xl">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-bold text-white font-[family-name:var(--font-syne)]">
              Nova<span className="text-red-600">Fire</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
              TECH
            </span>
          </div>
          <div className="flex items-center gap-3">
            {["dispatcher", "admin"].includes(profile.role) && (
              <Link
                href="/admin"
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Admin dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
              </Link>
            )}
            <span className="text-sm text-zinc-400 truncate max-w-[120px]">
              {firstName}
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

      <OfflineStatus />

      <main className="max-w-md mx-auto px-4 py-5 pb-28">{children}</main>

      <TechBottomNav />
    </div>
  );
}

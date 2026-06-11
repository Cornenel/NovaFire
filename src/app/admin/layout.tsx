import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOut } from "@/app/tech/actions";

export const metadata = {
  title: "Admin | Nova Fire",
  description:
    "Dispatch dashboard: customers, sites, assets, jobs, defects and stock.",
};

export default async function AdminLayout({
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

  const isDispatcher =
    profile &&
    profile.is_active &&
    ["dispatcher", "admin"].includes(profile.role);

  if (!isDispatcher) redirect("/tech-restricted");

  return (
    <div className="min-h-screen nf-bg-base">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0c0c0c]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-lg font-bold text-white font-[family-name:var(--font-syne)]">
              Nova<span className="text-red-600">Fire</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
              ADMIN
            </span>
          </div>
          <AdminNav />
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/tech"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Wrench className="w-4 h-4" />
              Tech App
            </Link>
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

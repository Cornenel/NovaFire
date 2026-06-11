import Link from "next/link";
import { Users, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createTechnician } from "@/app/admin/technician-actions";
import type { Profile } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Technicians | NovaFire Admin" };

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";
const labelCls = "block text-xs text-zinc-400 mb-1.5";

export default async function TechniciansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: techsData } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["technician", "dispatcher", "admin"])
    .order("is_active", { ascending: false })
    .order("full_name");

  const technicians = (techsData ?? []) as Profile[];

  // Open-job counts per technician (single query, grouped client-side)
  const { data: openJobs } = await supabase
    .from("jobs")
    .select("assigned_to")
    .in("status", ["not_started", "travelling", "on_site", "awaiting_parts"])
    .not("assigned_to", "is", null);

  const openCount = new Map<string, number>();
  for (const j of openJobs ?? []) {
    if (j.assigned_to)
      openCount.set(j.assigned_to, (openCount.get(j.assigned_to) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-1">
        <Users className="w-6 h-6 text-red-500" />
        Technicians
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Manage field staff accounts, access and job assignment.
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 mb-6">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* List */}
        <div className="lg:col-span-2">
          {technicians.length === 0 ? (
            <p className="text-zinc-500 text-sm">No staff accounts yet.</p>
          ) : (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
              {technicians.map((t) => {
                const open = openCount.get(t.id) ?? 0;
                return (
                  <Link
                    key={t.id}
                    href={`/admin/technicians/${t.id}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors",
                      !t.is_active && "opacity-60"
                    )}
                  >
                    <span className="w-9 h-9 rounded-full bg-red-600/15 border border-red-500/30 flex items-center justify-center text-xs font-bold text-red-400 shrink-0">
                      {(t.full_name || "?")
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">
                        {t.full_name || t.email || "Unnamed"}
                        {t.role !== "technician" && (
                          <span className="ml-2 text-[10px] uppercase font-mono text-zinc-500">
                            {t.role}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {t.email ?? "No email"}
                        {t.phone ? ` · ${t.phone}` : ""}
                        {t.vehicle_number ? ` · Van ${t.vehicle_number}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {open > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                          {open} open job{open > 1 ? "s" : ""}
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border",
                          t.is_active
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                        )}
                      >
                        {t.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Add technician */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Add Technician
          </h2>
          <form
            action={createTechnician}
            className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>First name *</label>
                <input name="first_name" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Last name *</label>
                <input name="last_name" required className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" name="email" required className={inputCls} />
            </div>
            <input name="phone" placeholder="Phone number" className={inputCls} />
            <input
              name="vehicle_number"
              placeholder="Vehicle / van number (optional)"
              className={inputCls}
            />
            <input
              name="saqcc_number"
              placeholder="SAQCC number (optional)"
              className={inputCls}
            />
            <input
              name="photo_url"
              placeholder="Profile photo URL (optional)"
              className={inputCls}
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
            >
              Invite Technician
            </button>
            <p className="text-[10px] text-zinc-600">
              An invite email is sent automatically – the technician sets their
              own password. No manual password needed.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

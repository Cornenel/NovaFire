import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, Package, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateTechnician } from "@/app/admin/technician-actions";
import {
  TechnicianStatusButton,
  PasswordResetButton,
  AssignJobButton,
} from "@/components/admin/technician-controls";
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_STYLES,
  JOB_TYPE_LABELS,
} from "@/lib/fsm/labels";
import type { Job, JobStatus, JobType, Profile } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";
const labelCls = "block text-xs text-zinc-400 mb-1.5";

export default async function TechnicianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: techData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (!techData) notFound();
  const tech = techData as Profile;

  const [{ data: jobsData }, { data: stockData }, { data: unassignedData }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id, job_number, job_type, status, scheduled_date, site:sites(name)")
        .eq("assigned_to", id)
        .order("scheduled_date", { ascending: false })
        .limit(25),
      supabase
        .from("van_stock")
        .select("quantity, stock_item:stock_items(name, unit)")
        .eq("technician_id", id)
        .order("quantity", { ascending: false }),
      // Open, unassigned jobs this technician could take
      supabase
        .from("jobs")
        .select("id, job_number, job_type, scheduled_date, site:sites(name)")
        .is("assigned_to", null)
        .in("status", ["not_started", "awaiting_parts"])
        .order("scheduled_date")
        .limit(15),
    ]);

  const jobs = (jobsData ?? []) as unknown as Array<
    Pick<Job, "id" | "job_number" | "scheduled_date"> & {
      job_type: JobType;
      status: JobStatus;
      site: { name: string } | null;
    }
  >;
  const stock = (stockData ?? []) as unknown as Array<{
    quantity: number;
    stock_item: { name: string; unit: string } | null;
  }>;
  const unassigned = (unassignedData ?? []) as unknown as Array<
    Pick<Job, "id" | "job_number" | "scheduled_date"> & {
      job_type: JobType;
      site: { name: string } | null;
    }
  >;

  return (
    <div>
      <Link
        href="/admin/technicians"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Technicians
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {tech.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tech.photo_url}
              alt=""
              className="w-12 h-12 rounded-full object-cover border border-white/10"
            />
          ) : (
            <span className="w-12 h-12 rounded-full bg-red-600/15 border border-red-500/30 flex items-center justify-center text-sm font-bold text-red-400">
              {(tech.full_name || "?")
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
              {tech.full_name || tech.email}
            </h1>
            <p className="text-sm text-zinc-500">
              {tech.email}
              <span
                className={cn(
                  "ml-2 text-[10px] px-2 py-0.5 rounded-full border align-middle",
                  tech.is_active
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                )}
              >
                {tech.is_active ? "Active" : "Inactive"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tech.email && <PasswordResetButton email={tech.email} />}
          <TechnicianStatusButton technicianId={tech.id} isActive={tech.is_active} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Assign open jobs */}
          {tech.is_active && unassigned.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
                <ClipboardList className="w-4 h-4" />
                Unassigned Jobs
              </h2>
              <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
                {unassigned.map((j) => (
                  <div
                    key={j.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-mono text-xs text-zinc-500 mr-2">
                          {j.job_number}
                        </span>
                        {JOB_TYPE_LABELS[j.job_type]}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {j.site?.name ?? "Site"} · {j.scheduled_date}
                      </p>
                    </div>
                    <AssignJobButton jobId={j.id} technicianId={tech.id} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job history */}
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
              <Briefcase className="w-4 h-4" />
              Job History ({jobs.length})
            </h2>
            {jobs.length === 0 ? (
              <p className="text-zinc-500 text-sm">No jobs assigned yet.</p>
            ) : (
              <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
                {jobs.map((j) => (
                  <Link
                    key={j.id}
                    href={`/admin/jobs/${j.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-mono text-xs text-zinc-500 mr-2">
                          {j.job_number}
                        </span>
                        {JOB_TYPE_LABELS[j.job_type]}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {j.site?.name ?? "Site"} · {j.scheduled_date}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border shrink-0",
                        JOB_STATUS_STYLES[j.status]
                      )}
                    >
                      {JOB_STATUS_LABELS[j.status]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Van stock */}
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
              <Package className="w-4 h-4" />
              Van Stock
            </h2>
            {stock.length === 0 ? (
              <p className="text-zinc-500 text-sm">
                No van stock set.{" "}
                <Link href="/admin/stock" className="text-red-400 hover:underline">
                  Manage stock →
                </Link>
              </p>
            ) : (
              <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
                {stock.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="text-sm text-zinc-300">
                      {s.stock_item?.name ?? "Item"}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        s.quantity === 0 ? "text-red-400" : "text-white"
                      )}
                    >
                      {s.quantity} {s.stock_item?.unit ?? ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Edit Details
          </h2>
          <form
            action={updateTechnician}
            className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-3"
          >
            <input type="hidden" name="id" value={tech.id} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>First name *</label>
                <input
                  name="first_name"
                  required
                  defaultValue={tech.first_name ?? tech.full_name.split(" ")[0] ?? ""}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Last name *</label>
                <input
                  name="last_name"
                  required
                  defaultValue={
                    tech.last_name ??
                    tech.full_name.split(" ").slice(1).join(" ") ??
                    ""
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email (managed by sign-in)</label>
              <input value={tech.email ?? ""} disabled className={cn(inputCls, "opacity-60")} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input name="phone" defaultValue={tech.phone ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Vehicle / van number</label>
              <input
                name="vehicle_number"
                defaultValue={tech.vehicle_number ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>SAQCC number</label>
              <input
                name="saqcc_number"
                defaultValue={tech.saqcc_number ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Profile photo URL</label>
              <input
                name="photo_url"
                defaultValue={tech.photo_url ?? ""}
                className={inputCls}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
            >
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

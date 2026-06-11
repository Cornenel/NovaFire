import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardCheck, AlertTriangle, Camera, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CompleteJobForm } from "@/components/tech/complete-job-form";
import {
  DEFECT_SEVERITY_LABELS,
  DEFECT_SEVERITY_STYLES,
} from "@/lib/fsm/labels";
import type { Defect, JobWithRelations } from "@/lib/fsm/types";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { ServiceRecommendations } from "@/components/tech/service-recommendations";
import { cn } from "@/lib/utils";

/** Job sign-off: summary of work completed + defects, then customer signature. */

export default async function CompleteJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("jobs")
    .select("*, customer:customers(*), site:sites(*)")
    .eq("id", id)
    .single();
  if (!data) notFound();
  const job = data as JobWithRelations;

  if (job.status === "completed") redirect(`/tech/jobs/${id}`);

  const [{ data: inspections }, { data: defects }, { count: photoCount }, { data: stockUsed }] =
    await Promise.all([
      supabase
        .from("inspections")
        .select("result, requires_refill, requires_pressure_test")
        .eq("job_id", id),
      supabase.from("defects").select("*").eq("job_id", id),
      supabase
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("job_id", id),
      supabase
        .from("stock_usage")
        .select("quantity, stock_item:stock_items(name)")
        .eq("job_id", id),
    ]);

  const passCount = (inspections ?? []).filter((i) => i.result === "pass").length;
  const failCount = (inspections ?? []).length - passCount;
  const jobDefects = (defects ?? []) as Defect[];
  const stock = (stockUsed ?? []) as unknown as Array<{
    quantity: number;
    stock_item: { name: string } | null;
  }>;

  // Phase 5 (F4): job-level service recommendations (display only)
  const jobRecommendations: string[] = [];
  if (featureFlags.serviceRecommendations) {
    const refills = (inspections ?? []).filter((i) => i.requires_refill).length;
    const pressureTests = (inspections ?? []).filter(
      (i) => i.requires_pressure_test
    ).length;
    const signDefects = jobDefects.filter(
      (d) => d.defect_type === "Missing signage" && d.status !== "resolved"
    ).length;
    if (refills > 0)
      jobRecommendations.push(
        `${refills} extinguisher${refills > 1 ? "s" : ""} require${refills > 1 ? "" : "s"} refill`
      );
    if (pressureTests > 0)
      jobRecommendations.push(
        `${pressureTests} extinguisher${pressureTests > 1 ? "s" : ""} require${pressureTests > 1 ? "" : "s"} hydro test`
      );
    if (signDefects > 0)
      jobRecommendations.push(
        `${signDefects} sign${signDefects > 1 ? "s" : ""} require${signDefects > 1 ? "" : "s"} replacement`
      );
  }

  return (
    <div>
      <Link
        href={`/tech/jobs/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to job
      </Link>

      <div className="mb-5">
        <p className="text-[11px] font-mono text-zinc-500">{job.job_number}</p>
        <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
          Job Sign-Off
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {job.customer.name} · {job.site.name}
        </p>
      </div>

      {/* Work summary */}
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5 mb-4">
        <div className="flex items-center gap-3 px-4 py-3">
          <ClipboardCheck className="w-4 h-4 text-zinc-500 shrink-0" />
          <span className="text-sm text-zinc-300 flex-1">Inspections</span>
          <span className="text-sm">
            <span className="text-emerald-400 font-semibold">{passCount} pass</span>
            {failCount > 0 && (
              <span className="text-red-400 font-semibold"> · {failCount} fail</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Camera className="w-4 h-4 text-zinc-500 shrink-0" />
          <span className="text-sm text-zinc-300 flex-1">Photos</span>
          <span className="text-sm text-white font-semibold">{photoCount ?? 0}</span>
        </div>
        {stock.length > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="text-sm text-zinc-300">Stock used</span>
            </div>
            <ul className="space-y-1 pl-7">
              {stock.map((s, i) => (
                <li key={i} className="text-xs text-zinc-400">
                  {s.quantity}× {s.stock_item?.name ?? "Item"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Defects found */}
      {jobDefects.length > 0 && (
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Defects Found ({jobDefects.length})
          </h2>
          <div className="space-y-2">
            {jobDefects.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white">{d.defect_type}</p>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border shrink-0",
                      DEFECT_SEVERITY_STYLES[d.severity]
                    )}
                  >
                    {DEFECT_SEVERITY_LABELS[d.severity]}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{d.description}</p>
                {d.quote_required && (
                  <p className="text-[11px] text-amber-500/90 mt-1">Quote required</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 5 (F4): recommendation panel only – no automatic changes */}
      {jobRecommendations.length > 0 && (
        <div className="mb-4">
          <ServiceRecommendations recommendations={jobRecommendations} />
        </div>
      )}

      <CompleteJobForm jobId={id} />
    </div>
  );
}

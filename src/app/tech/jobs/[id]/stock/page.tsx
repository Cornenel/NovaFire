import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { UseStockForm } from "@/components/tech/use-stock-form";
import type { VanStockRow } from "@/lib/fsm/types";

/** Use van stock on a job – quantities are deducted automatically. */

export default async function JobStockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number")
    .eq("id", id)
    .single();
  if (!job) notFound();

  const { data } = await supabase
    .from("van_stock")
    .select("*, stock_item:stock_items(*)")
    .eq("technician_id", user!.id)
    .gt("quantity", 0);

  const rows = ((data ?? []) as VanStockRow[]).sort((a, b) =>
    a.stock_item.name.localeCompare(b.stock_item.name)
  );

  const { data: used } = await supabase
    .from("stock_usage")
    .select("quantity, stock_item:stock_items(name)")
    .eq("job_id", id)
    .order("created_at", { ascending: false });

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
          Use Van Stock
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Items used are deducted from your van automatically.
        </p>
      </div>

      <UseStockForm
        jobId={id}
        stock={rows.map((r) => ({
          stockItemId: r.stock_item_id,
          name: r.stock_item.name,
          available: r.quantity,
        }))}
      />

      {(used ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Used on this job
          </h2>
          <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
            {(used as unknown as Array<{ quantity: number; stock_item: { name: string } | null }>).map(
              (u, i) => (
                <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-zinc-300">{u.stock_item?.name ?? "Item"}</span>
                  <span className="text-white font-semibold">{u.quantity}</span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

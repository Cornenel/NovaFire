import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { VanStockRow } from "@/lib/fsm/types";

/** Van stock – current quantities for the signed-in technician. */

export default async function VanStockPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("van_stock")
    .select("*, stock_item:stock_items(*)")
    .eq("technician_id", user!.id);

  const rows = ((data ?? []) as VanStockRow[]).sort((a, b) =>
    a.stock_item.name.localeCompare(b.stock_item.name)
  );

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em] mb-1">
          Van Stock
        </p>
        <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
          My Stock Levels
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Stock used on jobs is deducted automatically.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-8 text-center">
          <Package className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">No van stock allocated yet.</p>
          <p className="text-zinc-600 text-xs mt-1">
            Dispatch will allocate stock to your van.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
          {rows.map((row) => (
            <div
              key={row.stock_item_id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm text-zinc-200">{row.stock_item.name}</p>
                <p className="text-[11px] text-zinc-600 capitalize">
                  {row.stock_item.category}
                </p>
              </div>
              <span
                className={
                  row.quantity === 0
                    ? "text-red-400 font-semibold"
                    : "text-white font-semibold"
                }
              >
                {row.quantity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Package, Plus } from "lucide-react";
import { runOrQueue } from "@/lib/offline/outbox";
import { getLocalUserId } from "@/lib/offline/operations";

interface StockOption {
  stockItemId: string;
  name: string;
  available: number;
}

export function UseStockForm({
  jobId,
  stock,
}: {
  jobId: string;
  stock: StockOption[];
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const totalSelected = Object.values(quantities).reduce((a, b) => a + b, 0);

  function adjust(id: string, delta: number, max: number) {
    setQuantities((prev) => {
      const next = Math.max(0, Math.min(max, (prev[id] ?? 0) + delta));
      return { ...prev, [id]: next };
    });
  }

  async function handleSubmit() {
    setError("");
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([stockItemId, quantity]) => ({ stockItemId, quantity }));
    if (items.length === 0) return;

    setIsPending(true);
    const technicianId = await getLocalUserId();
    if (!technicianId) {
      setError("Session expired – please sign in again.");
      setIsPending(false);
      return;
    }

    const res = await runOrQueue({
      type: "stock_usage",
      payload: { jobId, technicianId, items },
    });

    setIsPending(false);
    if (res.error) {
      setError(
        res.error.includes("check constraint")
          ? "Not enough stock in your van for one of the items."
          : res.error
      );
      return;
    }
    router.push(`/tech/jobs/${jobId}`);
    router.refresh();
  }

  if (stock.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-8 text-center">
        <Package className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
        <p className="text-zinc-400 text-sm">No van stock available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
        {stock.map((item) => {
          const qty = quantities[item.stockItemId] ?? 0;
          return (
            <div
              key={item.stockItemId}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-zinc-200 truncate">{item.name}</p>
                <p className="text-[11px] text-zinc-600">
                  {item.available} in van
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => adjust(item.stockItemId, -1, item.available)}
                  disabled={qty === 0}
                  className="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 flex items-center justify-center disabled:opacity-30"
                  aria-label={`Remove one ${item.name}`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span
                  className={
                    qty > 0
                      ? "w-6 text-center text-white font-semibold"
                      : "w-6 text-center text-zinc-600"
                  }
                >
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => adjust(item.stockItemId, 1, item.available)}
                  disabled={qty >= item.available}
                  className="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 flex items-center justify-center disabled:opacity-30"
                  aria-label={`Add one ${item.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={totalSelected === 0 || isPending}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Package className="w-4 h-4" />
        )}
        {totalSelected > 0
          ? `Use ${totalSelected} item${totalSelected > 1 ? "s" : ""}`
          : "Select items to use"}
      </button>
    </div>
  );
}

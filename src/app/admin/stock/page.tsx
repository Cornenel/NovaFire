import { createClient } from "@/lib/supabase/server";
import { setVanStock } from "@/app/admin/actions";

const inputCls =
  "px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";

interface VanStockEntry {
  technician_id: string;
  stock_item_id: string;
  quantity: number;
  technician: { full_name: string } | null;
  stock_item: { name: string } | null;
}

interface UsageEntry {
  quantity: number;
  created_at: string;
  technician: { full_name: string } | null;
  stock_item: { name: string } | null;
  job: { id: string; job_number: string } | null;
}

export default async function AdminStockPage() {
  const supabase = await createClient();

  const [{ data: vanStock }, { data: usage }, { data: technicians }, { data: items }] =
    await Promise.all([
      supabase
        .from("van_stock")
        .select(
          "technician_id, stock_item_id, quantity, technician:profiles(full_name), stock_item:stock_items(name)"
        ),
      supabase
        .from("stock_usage")
        .select(
          "quantity, created_at, technician:profiles(full_name), stock_item:stock_items(name), job:jobs(id, job_number)"
        )
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["technician", "dispatcher", "admin"])
        .eq("is_active", true)
        .order("full_name"),
      supabase.from("stock_items").select("id, name").eq("is_active", true).order("name"),
    ]);

  const stock = (vanStock ?? []) as unknown as VanStockEntry[];
  const usageRows = (usage ?? []) as unknown as UsageEntry[];

  // Group van stock by technician
  const byTech = new Map<string, VanStockEntry[]>();
  for (const row of stock) {
    const key = row.technician?.full_name ?? row.technician_id;
    byTech.set(key, [...(byTech.get(key) ?? []), row]);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-6">
        Van Stock
      </h1>

      {/* Allocate */}
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 mb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">
          Set Technician Stock
        </h2>
        <form action={setVanStock} className="flex flex-wrap gap-2">
          <select name="technician_id" required className={inputCls}>
            <option value="">Technician…</option>
            {(technicians ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
          <select name="stock_item_id" required className={inputCls}>
            <option value="">Item…</option>
            {(items ?? []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="quantity"
            min={0}
            placeholder="Qty"
            required
            className={`${inputCls} w-24`}
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
          >
            Set Quantity
          </button>
        </form>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Current stock by technician */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Current Van Stock
          </h2>
          {byTech.size === 0 ? (
            <p className="text-zinc-500 text-sm">No stock allocated.</p>
          ) : (
            <div className="space-y-4">
              {Array.from(byTech.entries()).map(([techName, rows]) => (
                <div
                  key={techName}
                  className="rounded-xl border border-white/[0.08] nf-glass-panel"
                >
                  <p className="px-4 py-3 text-sm font-semibold text-white border-b border-white/[0.06]">
                    {techName}
                  </p>
                  <div className="divide-y divide-white/5">
                    {rows
                      .sort((a, b) =>
                        (a.stock_item?.name ?? "").localeCompare(b.stock_item?.name ?? "")
                      )
                      .map((r) => (
                        <div
                          key={r.stock_item_id}
                          className="flex justify-between px-4 py-2 text-sm"
                        >
                          <span className="text-zinc-300">{r.stock_item?.name}</span>
                          <span
                            className={
                              r.quantity === 0
                                ? "text-red-400 font-semibold"
                                : "text-white font-semibold"
                            }
                          >
                            {r.quantity}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage log */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Recent Usage
          </h2>
          {usageRows.length === 0 ? (
            <p className="text-zinc-500 text-sm">No stock used yet.</p>
          ) : (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
              {usageRows.map((u, i) => (
                <div key={i} className="px-4 py-2.5 text-sm">
                  <p className="text-zinc-200">
                    {u.quantity}× {u.stock_item?.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {u.technician?.full_name}
                    {u.job && <> · {u.job.job_number}</>}
                    {" · "}
                    {new Date(u.created_at).toLocaleString("en-ZA", {
                      timeZone: "Africa/Johannesburg",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

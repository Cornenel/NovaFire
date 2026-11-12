import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setVanStock } from "@/app/admin/actions";
import {
  adjustWarehouseOnHand,
  importZohoStockCatalog,
  issueStockToTechnician,
} from "@/app/admin/stock/actions";

const inputCls =
  "px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";

interface WarehouseRow {
  stock_item_id: string;
  quantity_on_hand: number;
  stock_item: {
    id: string;
    name: string;
    sku: string | null;
    category: string;
    unit: string;
    source: string | null;
    legacy_zoho_item_id: string | null;
    is_active: boolean;
  } | null;
}

interface VanStockEntry {
  technician_id: string;
  stock_item_id: string;
  quantity: number;
  technician: { full_name: string } | null;
  stock_item: { name: string; category: string } | null;
}

interface UsageEntry {
  quantity: number;
  created_at: string;
  technician: { full_name: string } | null;
  stock_item: { name: string } | null;
  job: { id: string; job_number: string } | null;
}

interface MovementEntry {
  id: string;
  movement_type: string;
  quantity_delta: number;
  quantity_after: number | null;
  notes: string | null;
  created_at: string;
  stock_item: { name: string } | null;
  technician: { full_name: string } | null;
}

const NOTICES: Record<string, string> = {
  imported: "Zoho catalogue imported (products and services).",
  import_failed: "Zoho stock import failed.",
  issued: "Stock booked out to the technician van.",
  issue_failed: "Could not book stock to the van.",
  adjusted: "Warehouse on-hand updated.",
  adjust_failed: "Could not adjust warehouse stock.",
};

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const notice = params.notice ? NOTICES[params.notice] ?? null : null;
  const noticeError = params.error;
  const supabase = await createClient();

  const [
    { data: warehouseRaw },
    { data: vanStock },
    { data: usage },
    { data: movements },
    { data: technicians },
    { data: items },
  ] = await Promise.all([
    supabase
      .from("warehouse_stock")
      .select(
        "stock_item_id, quantity_on_hand, stock_item:stock_items(id, name, sku, category, unit, source, legacy_zoho_item_id, is_active)"
      )
      .order("quantity_on_hand", { ascending: false }),
    supabase
      .from("van_stock")
      .select(
        "technician_id, stock_item_id, quantity, technician:profiles(full_name), stock_item:stock_items(name, category)"
      ),
    supabase
      .from("stock_usage")
      .select(
        "quantity, created_at, technician:profiles(full_name), stock_item:stock_items(name), job:jobs(id, job_number)"
      )
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("stock_movements")
      .select(
        "id, movement_type, quantity_delta, quantity_after, notes, created_at, stock_item:stock_items(name), technician:profiles(full_name)"
      )
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["technician", "dispatcher", "admin"])
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("stock_items")
      .select("id, name, category, is_active")
      .eq("is_active", true)
      .order("name"),
  ]);

  const warehouse = (warehouseRaw ?? []) as unknown as WarehouseRow[];
  const stock = (vanStock ?? []) as unknown as VanStockEntry[];
  const usageRows = (usage ?? []) as unknown as UsageEntry[];
  const movementRows = (movements ?? []) as unknown as MovementEntry[];

  const inventoryItems = (items ?? []).filter((i) => i.category !== "service");
  const serviceCount = warehouse.filter((w) => w.stock_item?.category === "service").length;
  const inventoryCount = warehouse.filter((w) => w.stock_item?.category !== "service").length;

  const byTech = new Map<string, VanStockEntry[]>();
  for (const row of stock) {
    const key = row.technician?.full_name ?? row.technician_id;
    byTech.set(key, [...(byTech.get(key) ?? []), row]);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
            Stock
          </h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
            Warehouse holds Zoho products and services. Book inventory out to technician vans
            here. Job usage still deducts from the van automatically — that workflow is unchanged.
          </p>
        </div>
        <form action={importZohoStockCatalog} className="rounded-xl border border-white/10 p-4 space-y-3 min-w-[240px]">
          <p className="text-sm font-medium text-white">Import from Zoho Books</p>
          <p className="text-xs text-zinc-500">
            Pulls products <span className="text-zinc-300">and services</span> into the catalogue.
          </p>
          <label className="flex items-start gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              name="sync_quantities"
              value="true"
              className="mt-0.5 accent-red-600"
            />
            Also sync warehouse on-hand from Zoho inventory quantities
          </label>
          <button
            type="submit"
            className="w-full px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
          >
            Import catalogue
          </button>
          <Link
            href="/admin/integrations/zoho"
            className="block text-center text-xs text-zinc-500 hover:text-white"
          >
            Zoho connection settings
          </Link>
        </form>
      </div>

      {notice && (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          {notice}
          {params.notice === "imported" && (
            <span className="block text-xs text-sky-200/80 mt-1">
              Fetched {params.fetched ?? "—"} · inventory {params.inventory ?? "—"} · services{" "}
              {params.services ?? "—"} · created {params.created ?? "—"} · updated{" "}
              {params.updated ?? "—"}
              {params.synced ? ` · qty synced ${params.synced}` : ""}
            </span>
          )}
          {noticeError ? (
            <span className="block text-xs text-amber-200 mt-1">{noticeError}</span>
          ) : null}
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Warehouse inventory rows" value={inventoryCount} />
        <Stat label="Services in catalogue" value={serviceCount} />
        <Stat label="Technician van lines" value={stock.length} />
      </div>

      {/* Warehouse */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Warehouse</h2>
        {warehouse.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No warehouse rows yet. Import from Zoho or add stock items first.
          </p>
        ) : (
          <div className="rounded-xl border border-white/[0.08] nf-glass-panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">On hand</th>
                  <th className="px-4 py-3 font-medium">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {warehouse.map((row) => {
                  const item = row.stock_item;
                  if (!item) return null;
                  const isService = item.category === "service";
                  return (
                    <tr key={row.stock_item_id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="text-white">{item.name}</p>
                        <p className="text-xs text-zinc-500">
                          {item.sku ? `SKU ${item.sku} · ` : ""}
                          {item.unit}
                          {item.legacy_zoho_item_id ? " · Zoho" : ""}
                          {!item.is_active ? " · inactive" : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 capitalize">
                        {isService ? "Service" : item.category || "Inventory"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            isService
                              ? "text-zinc-500"
                              : row.quantity_on_hand === 0
                                ? "text-amber-400 font-semibold"
                                : "text-white font-semibold"
                          }
                        >
                          {isService ? "—" : row.quantity_on_hand}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isService ? (
                          <span className="text-xs text-zinc-600">Catalogue only</span>
                        ) : (
                          <form action={adjustWarehouseOnHand} className="flex flex-wrap gap-2">
                            <input type="hidden" name="stock_item_id" value={row.stock_item_id} />
                            <input
                              type="number"
                              name="quantity"
                              min={0}
                              defaultValue={row.quantity_on_hand}
                              required
                              className={`${inputCls} w-24`}
                            />
                            <input
                              type="text"
                              name="notes"
                              placeholder="Reason"
                              className={`${inputCls} w-36`}
                            />
                            <button
                              type="submit"
                              className="px-3 py-2 rounded-lg border border-white/10 text-xs text-zinc-200 hover:bg-white/5"
                            >
                              Save
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Book out + van correction */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">
            Book out to technician
          </h2>
          <p className="text-xs text-zinc-500">
            Moves quantity from warehouse → van. Services cannot be booked out.
          </p>
          <form action={issueStockToTechnician} className="flex flex-wrap gap-2">
            <select name="technician_id" required className={inputCls}>
              <option value="">Technician…</option>
              {(technicians ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
            <select name="stock_item_id" required className={inputCls}>
              <option value="">Inventory item…</option>
              {inventoryItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              name="quantity"
              min={1}
              placeholder="Qty"
              required
              className={`${inputCls} w-24`}
            />
            <input
              type="text"
              name="notes"
              placeholder="Notes (optional)"
              className={`${inputCls} min-w-[140px] flex-1`}
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm"
            >
              Book out
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">
            Set van quantity (correction)
          </h2>
          <p className="text-xs text-zinc-500">
            Absolute van level only — does not change warehouse. Keep using this for corrections;
            prefer Book out for normal issues.
          </p>
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
              {inventoryItems.map((i) => (
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
              className="px-5 py-2.5 rounded-lg border border-white/10 text-white font-semibold text-sm hover:bg-white/5"
            >
              Set van qty
            </button>
          </form>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Current van stock</h2>
          {byTech.size === 0 ? (
            <p className="text-zinc-500 text-sm">No stock allocated to vans.</p>
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

        <div className="space-y-8">
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recent movements</h2>
            {movementRows.length === 0 ? (
              <p className="text-zinc-500 text-sm">No warehouse movements yet.</p>
            ) : (
              <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
                {movementRows.map((m) => (
                  <div key={m.id} className="px-4 py-2.5 text-sm">
                    <p className="text-zinc-200">
                      {m.movement_type.replace(/_/g, " ")} · {m.stock_item?.name}
                      {m.quantity_delta !== 0 && (
                        <span className="text-zinc-400">
                          {" "}
                          ({m.quantity_delta > 0 ? "+" : ""}
                          {m.quantity_delta}
                          {m.quantity_after != null ? ` → ${m.quantity_after}` : ""})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {m.technician?.full_name ? `${m.technician.full_name} · ` : ""}
                      {m.notes ? `${m.notes} · ` : ""}
                      {new Date(m.created_at).toLocaleString("en-ZA", {
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

          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recent job usage</h2>
            {usageRows.length === 0 ? (
              <p className="text-zinc-500 text-sm">No stock used on jobs yet.</p>
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm text-white mt-1">{value}</p>
    </div>
  );
}

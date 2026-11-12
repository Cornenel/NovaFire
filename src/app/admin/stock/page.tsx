import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setVanStock } from "@/app/admin/actions";
import {
  adjustWarehouseOnHand,
  importZohoItemsCsv,
  importZohoStockCatalog,
  issueStockToTechnician,
} from "@/app/admin/stock/actions";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import {
  buildAdminListHref,
  ilikePattern,
  parseAdminListParams,
} from "@/lib/admin/list-params";
import { cn } from "@/lib/utils";

const inputCls =
  "px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";

type KindFilter = "all" | "stock" | "service";

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stock", label: "Stock items" },
  { value: "service", label: "Services" },
];

interface CatalogueRow {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  source: string | null;
  legacy_zoho_item_id: string | null;
  is_active: boolean;
  warehouse_stock: { quantity_on_hand: number } | { quantity_on_hand: number }[] | null;
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
  imported:
    "Zoho API catalogue imported using Product Type (goods → stock, service → service).",
  csv_imported:
    "Zoho Items.csv applied — Product Type is the source of truth for stock vs services.",
  import_failed: "Zoho stock import failed.",
  issued: "Stock booked out to the technician van.",
  issue_failed: "Could not book stock to the van.",
  adjusted: "Warehouse on-hand updated.",
  adjust_failed: "Could not adjust warehouse stock.",
};

function warehouseQty(row: CatalogueRow): number {
  const wh = row.warehouse_stock;
  if (!wh) return 0;
  if (Array.isArray(wh)) return wh[0]?.quantity_on_hand ?? 0;
  return wh.quantity_on_hand ?? 0;
}

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { q, page, pageSize, from, to } = parseAdminListParams(params);
  const kind: KindFilter =
    params.kind === "stock" || params.kind === "service" ? params.kind : "all";
  const notice = params.notice ? NOTICES[params.notice] ?? null : null;
  const noticeError = params.error;
  const supabase = await createClient();

  let catalogueQuery = supabase
    .from("stock_items")
    .select(
      "id, name, sku, category, unit, source, legacy_zoho_item_id, is_active, warehouse_stock(quantity_on_hand)",
      { count: "exact" }
    )
    .order("name")
    .range(from, to);

  if (kind === "service") {
    catalogueQuery = catalogueQuery.eq("category", "service");
  } else if (kind === "stock") {
    catalogueQuery = catalogueQuery.neq("category", "service");
  }

  if (q) {
    const pattern = ilikePattern(q);
    catalogueQuery = catalogueQuery.or(
      `name.ilike.${pattern},sku.ilike.${pattern},unit.ilike.${pattern}`
    );
  }

  const [
    { data: catalogueRaw, count: catalogueCount },
    { count: inventoryCount },
    { count: serviceCount },
    { data: vanStock },
    { data: usage },
    { data: movements },
    { data: technicians },
    { data: bookOutItems },
  ] = await Promise.all([
    catalogueQuery,
    supabase
      .from("stock_items")
      .select("id", { count: "exact", head: true })
      .neq("category", "service"),
    supabase
      .from("stock_items")
      .select("id", { count: "exact", head: true })
      .eq("category", "service"),
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
      .select("id, name")
      .eq("is_active", true)
      .neq("category", "service")
      .order("name"),
  ]);

  const catalogue = (catalogueRaw ?? []) as unknown as CatalogueRow[];
  const totalCount = catalogueCount ?? 0;
  const stock = (vanStock ?? []) as unknown as VanStockEntry[];
  const usageRows = (usage ?? []) as unknown as UsageEntry[];
  const movementRows = (movements ?? []) as unknown as MovementEntry[];
  const inventoryItems = bookOutItems ?? [];

  const byTech = new Map<string, VanStockEntry[]>();
  for (const row of stock) {
    const key = row.technician?.full_name ?? row.technician_id;
    byTech.set(key, [...(byTech.get(key) ?? []), row]);
  }

  const listParams = {
    q: q || undefined,
    kind: kind === "all" ? undefined : kind,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
            Stock
          </h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
            Stock items are goods you sell or hold. Services are work you render and charge for
            (e.g. extinguisher services). Book stock out to vans here — job usage still deducts
            from the van automatically.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 min-w-[280px] max-w-xl">
          <form
            action={importZohoItemsCsv}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3"
          >
            <p className="text-sm font-medium text-white">Fix from Zoho Items.csv</p>
            <p className="text-xs text-zinc-500">
              Upload the Books export. Uses{" "}
              <span className="text-zinc-300">Product Type</span> only — goods = stock, service =
              service (e.g. extinguisher services).
            </p>
            <input
              type="file"
              name="csv_file"
              accept=".csv,text/csv"
              required
              className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white"
            />
            <button
              type="submit"
              className="w-full px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
            >
              Apply CSV
            </button>
          </form>

          <form
            action={importZohoStockCatalog}
            className="rounded-xl border border-white/10 p-4 space-y-3"
          >
            <p className="text-sm font-medium text-white">Live Zoho API import</p>
            <p className="text-xs text-zinc-500">
              Pulls via API + item details for Product Type. Prefer CSV if types still look wrong.
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
              Import from API
            </button>
            <Link
              href="/admin/integrations/zoho"
              className="block text-center text-xs text-zinc-500 hover:text-white"
            >
              Zoho connection settings
            </Link>
          </form>
        </div>
      </div>

      {notice && (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          {notice}
          {(params.notice === "imported" || params.notice === "csv_imported") && (
            <span className="block text-xs text-sky-200/80 mt-1">
              Fetched {params.fetched ?? "—"} · stock {params.inventory ?? "—"} · services{" "}
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
        <Stat label="Stock items" value={inventoryCount ?? 0} />
        <Stat label="Services" value={serviceCount ?? 0} />
        <Stat label="Technician van lines" value={stock.length} />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Catalogue</h2>

        <AdminListToolbar
          action="/admin/stock"
          q={q}
          placeholder="Search name, SKU, or unit…"
          hidden={{ kind: kind === "all" ? undefined : kind }}
        />

        <div className="flex flex-wrap gap-1.5 mb-5">
          {KIND_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildAdminListHref(
                "/admin/stock",
                { q, kind: f.value === "all" ? undefined : f.value },
                { page: 1 }
              )}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                kind === f.value
                  ? "bg-red-600/20 border-red-500/40 text-red-400"
                  : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {catalogue.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {q || kind !== "all"
              ? "No catalogue rows match that search."
              : "No catalogue rows yet. Import from Zoho or add stock items first."}
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
                {catalogue.map((item) => {
                  const isService = item.category === "service";
                  const qty = warehouseQty(item);
                  return (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="text-white">{item.name}</p>
                        <p className="text-xs text-zinc-500">
                          {item.sku ? `SKU ${item.sku} · ` : ""}
                          {item.unit}
                          {item.legacy_zoho_item_id ? " · Zoho" : ""}
                          {!item.is_active ? " · inactive" : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {isService ? "Service" : "Stock"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            isService
                              ? "text-zinc-500"
                              : qty === 0
                                ? "text-amber-400 font-semibold"
                                : "text-white font-semibold"
                          }
                        >
                          {isService ? "—" : qty}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isService ? (
                          <span className="text-xs text-zinc-600">Catalogue only</span>
                        ) : (
                          <form action={adjustWarehouseOnHand} className="flex flex-wrap gap-2">
                            <input type="hidden" name="stock_item_id" value={item.id} />
                            <input
                              type="number"
                              name="quantity"
                              min={0}
                              defaultValue={qty}
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

        <AdminPagination
          pathname="/admin/stock"
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          params={listParams}
        />
      </section>

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
              <option value="">Stock item…</option>
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
            Absolute van level only — does not change warehouse. Prefer Book out for normal issues.
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
              <option value="">Stock item…</option>
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

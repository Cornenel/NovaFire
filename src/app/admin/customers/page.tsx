import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createCustomer } from "@/app/admin/actions";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import {
  ilikePattern,
  parseAdminListParams,
} from "@/lib/admin/list-params";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";

type CustomerListRow = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  is_sla_client: boolean | null;
  status: string | null;
  import_source: string | null;
  legacy_zoho_customer_id: string | null;
  notes: string | null;
  sites: Array<{ count: number }> | null;
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const { q, page, pageSize, from, to } = parseAdminListParams(raw);
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select(
      "id, name, contact_person, phone, is_sla_client, status, import_source, legacy_zoho_customer_id, notes, sites(count)",
      { count: "exact" }
    )
    .order("name")
    .range(from, to);

  if (q) {
    const pattern = ilikePattern(q);
    query = query.or(
      `name.ilike.${pattern},trading_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},contact_person.ilike.${pattern}`
    );
  }

  const { data, count } = await query;
  const customers = (data ?? []) as unknown as CustomerListRow[];
  const totalCount = count ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-6">
        Customers
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AdminListToolbar
            action="/admin/customers"
            q={q}
            placeholder="Search name, contact, email, phone…"
          />

          {customers.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              {q ? "No customers match that search." : "No customers yet."}
            </p>
          ) : (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
              {customers.map((c) => {
                const siteCount = c.sites?.[0]?.count ?? 0;
                return (
                  <Link
                    key={c.id}
                    href={`/admin/customers/${c.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white">
                        {c.name}
                        {c.is_sla_client && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            SLA
                          </span>
                        )}
                        {c.status === "inactive" && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            Inactive
                          </span>
                        )}
                        {(c.import_source === "zoho_import" ||
                          c.legacy_zoho_customer_id ||
                          (c.notes ?? "")
                            .toLowerCase()
                            .includes("imported from zoho")) && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                            Zoho
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {c.contact_person ?? "—"}
                        {c.phone ? ` · ${c.phone}` : ""}
                        {` · ${siteCount} site${siteCount === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}

          <AdminPagination
            pathname="/admin/customers"
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            params={{ q }}
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            New Customer
          </h2>
          <form
            action={createCustomer}
            className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-3"
          >
            <input name="name" placeholder="Company / customer name *" required className={inputCls} />
            <input name="contact_person" placeholder="Contact person" className={inputCls} />
            <input name="email" type="email" placeholder="Email" className={inputCls} />
            <input name="phone" type="tel" placeholder="Phone" className={inputCls} />
            <input name="billing_address" placeholder="Billing address" className={inputCls} />
            <label className="flex items-center gap-2 text-sm text-zinc-300 py-1 cursor-pointer">
              <input type="checkbox" name="is_sla_client" className="w-4 h-4 accent-red-600" />
              SLA client (priority response)
            </label>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
            >
              Create Customer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

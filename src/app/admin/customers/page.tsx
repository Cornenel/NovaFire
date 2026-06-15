import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createCustomer } from "@/app/admin/actions";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";

export default async function AdminCustomersPage() {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, contact_person, phone, is_sla_client, status, import_source, legacy_zoho_customer_id, notes, sites(id)")
    .order("name");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-6">
        Customers
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* List */}
        <div className="lg:col-span-2">
          {(customers ?? []).length === 0 ? (
            <p className="text-zinc-500 text-sm">No customers yet.</p>
          ) : (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
              {(customers ?? []).map((c) => (
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
                        (c.notes ?? "").toLowerCase().includes("imported from zoho")) && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          Zoho
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {c.contact_person ?? "—"}
                      {c.phone ? ` · ${c.phone}` : ""}
                      {` · ${(c.sites ?? []).length} site${(c.sites ?? []).length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Create */}
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

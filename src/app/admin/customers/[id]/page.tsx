import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSite } from "@/app/admin/actions";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*, sites(id, name, address, contact_person, assets(id))")
    .eq("id", id)
    .single();
  if (!customer) notFound();

  return (
    <div>
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Customers
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
          {customer.name}
          {customer.is_sla_client && (
            <span className="ml-3 text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 align-middle">
              SLA
            </span>
          )}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {customer.contact_person ?? "No contact"}
          {customer.email ? ` · ${customer.email}` : ""}
          {customer.phone ? ` · ${customer.phone}` : ""}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sites */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Sites ({(customer.sites ?? []).length})
          </h2>
          {(customer.sites ?? []).length === 0 ? (
            <p className="text-zinc-500 text-sm">No sites yet – add one.</p>
          ) : (
            <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
              {customer.sites.map(
                (s: {
                  id: string;
                  name: string;
                  address: string;
                  assets: Array<{ id: string }>;
                }) => (
                  <Link
                    key={s.id}
                    href={`/admin/sites/${s.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white">{s.name}</p>
                      <p className="flex items-center gap-1 text-xs text-zinc-500 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {s.address} · {(s.assets ?? []).length} assets
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                  </Link>
                )
              )}
            </div>
          )}
        </div>

        {/* Add site */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">New Site</h2>
          <form
            action={createSite}
            className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-3"
          >
            <input type="hidden" name="customer_id" value={customer.id} />
            <input name="name" placeholder="Site name *" required className={inputCls} />
            <input name="address" placeholder="Address *" required className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input name="latitude" placeholder="Latitude" className={inputCls} />
              <input name="longitude" placeholder="Longitude" className={inputCls} />
            </div>
            <input name="contact_person" placeholder="Site contact" className={inputCls} />
            <input name="contact_phone" type="tel" placeholder="Contact phone" className={inputCls} />
            <textarea
              name="access_notes"
              placeholder="Access notes (gate codes, sign-in, etc.)"
              rows={2}
              className={inputCls}
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
            >
              Add Site
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

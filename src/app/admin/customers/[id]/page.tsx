import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSite } from "@/app/admin/actions";
import { CustomerEditPanel } from "@/components/admin/customer-edit-form";
import { PortalUsersPanel } from "@/components/admin/portal-users-panel";
import { ComplianceScoreBadge } from "@/components/admin/compliance-score-badge";
import { featureFlags } from "@/lib/fsm/feature-flags";
import { loadCustomerCompliance } from "@/lib/fsm/customer-compliance";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ portal_error?: string }>;
}) {
  const { id } = await params;
  const { portal_error: portalError } = await searchParams;
  const supabase = await createClient();

  const [
    { data: customer },
    {
      data: { user },
    },
    { count: importedRowsCount },
    { count: importedJobsCount },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("*, sites(id, name, address, contact_person, assets(id))")
      .eq("id", id)
      .single(),
    supabase.auth.getUser(),
    supabase
      .from("import_rows")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id)
      .eq("import_source", "zoho_import"),
  ]);
  if (!customer) notFound();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single()
    : { data: null };
  const isAdmin = profile?.is_active && profile.role === "admin";
  const isImportedFromZoho =
    customer.import_source === "zoho_import" ||
    Boolean(customer.legacy_zoho_customer_id) ||
    (customer.notes ?? "").toLowerCase().includes("imported from zoho") ||
    (importedRowsCount ?? 0) > 0 ||
    (importedJobsCount ?? 0) > 0;

  const compliance =
    featureFlags.complianceScore
      ? await loadCustomerCompliance(supabase, customer.id)
      : null;

  return (
    <div>
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Customers
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
            {customer.name}
            {customer.is_sla_client && (
              <span className="ml-3 text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 align-middle">
                SLA
              </span>
            )}
            {customer.status === "inactive" && (
              <span className="ml-3 text-xs px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 align-middle">
                Inactive
              </span>
            )}
            {isImportedFromZoho && (
              <span className="ml-3 text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 align-middle">
                Imported from Zoho
              </span>
            )}
          </h1>
          {customer.trading_name && (
            <p className="text-sm text-zinc-400 mt-1">
              Trading as {customer.trading_name}
            </p>
          )}
          <p className="text-sm text-zinc-500 mt-1">
            {customer.contact_person ?? "No contact"}
            {customer.email ? ` · ${customer.email}` : ""}
            {customer.phone ? ` · ${customer.phone}` : ""}
          </p>
          {compliance ? (
            <div className="mt-3">
              <ComplianceScoreBadge result={compliance} size="lg" />
            </div>
          ) : null}
        </div>
        {isAdmin && <CustomerEditPanel customer={customer} />}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sites */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 mb-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Customer Details
            </h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <Detail label="VAT number" value={customer.vat_number} />
              <Detail
                label="Registration number"
                value={customer.registration_number}
              />
              <Detail label="Billing address" value={customer.billing_address} />
              <Detail
                label="Physical / site address"
                value={customer.physical_address}
              />
            </dl>
            {customer.notes && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-zinc-500 mb-1">Notes</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                  {customer.notes}
                </p>
              </div>
            )}
          </div>

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

      {featureFlags.customerPortal ? (
        <div className="mt-8">
          <PortalUsersPanel
            customerId={customer.id}
            sites={(customer.sites ?? []).map((site: { id: string; name: string }) => ({
              id: site.id,
              name: site.name,
            }))}
            error={portalError}
          />
        </div>
      ) : null}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 mb-1">{label}</dt>
      <dd className="text-zinc-300 whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );
}

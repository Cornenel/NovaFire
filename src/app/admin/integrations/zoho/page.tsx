import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { zohoEnvironmentStatus } from "@/lib/integrations/zoho/config";
import { ZOHO_NOTICES } from "@/lib/integrations/zoho/notices";
import {
  disconnectZoho,
  refreshZohoDocuments,
  refreshZohoOrganizations,
  selectZohoOrganization,
  startZohoCustomerPreview,
  testZohoConnection,
  unlinkZohoCustomer,
} from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata = { title: "Zoho Books | Nova Fire Admin" };

const buttonClass =
  "px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-40";
const secondaryClass =
  "px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-200 hover:bg-white/5";
const panelClass = "rounded-xl border border-white/[0.08] nf-glass-panel p-4";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm text-white mt-1">{value}</p>
    </div>
  );
}

export default async function ZohoBooksAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/tech-login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();
  if (!profile?.is_active || profile.role !== "admin") redirect("/admin");

  const environment = zohoEnvironmentStatus();
  const connectionResult = await supabase
    .from("zoho_books_connections")
    .select(
      "id, status, accounts_url, api_domain, organization_id, organization_name, scopes, connected_at, last_connection_test_at, last_connection_test_ok, last_error_code, last_error_message, last_sync_at"
    )
    .eq("singleton", true)
    .maybeSingle();
  const migrationMissing = Boolean(
    connectionResult.error &&
      (connectionResult.error.code === "42P01" ||
        connectionResult.error.message.toLowerCase().includes("zoho_books"))
  );
  const connection = connectionResult.data;

  const [{ data: organizations }, { data: runs }, { data: mappingRows }, { data: documents }] =
    connection && !migrationMissing
      ? await Promise.all([
          supabase
            .from("zoho_books_organizations")
            .select("organization_id, name, is_default_org")
            .eq("connection_id", connection.id)
            .order("name"),
          supabase
            .from("zoho_books_sync_runs")
            .select("id, mode, status, started_at, completed_at, summary, error_message")
            .order("started_at", { ascending: false })
            .limit(8),
          supabase
            .from("zoho_books_contact_mappings")
            .select("id, zoho_contact_id, customer_id, match_method")
            .eq("organization_id", connection.organization_id ?? "")
            .order("updated_at", { ascending: false })
            .limit(12),
          supabase
            .from("zoho_books_document_links")
            .select("document_type, document_number, document_status, document_date, contact_name, total, currency_code")
            .eq("organization_id", connection.organization_id ?? "")
            .order("last_seen_at", { ascending: false })
            .limit(15),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const mappingCustomerIds = (mappingRows ?? []).map((mapping) => mapping.customer_id);
  const { data: mappedCustomers } =
    mappingCustomerIds.length > 0
      ? await supabase.from("customers").select("id, name").in("id", mappingCustomerIds)
      : { data: [] };
  const customerNameById = new Map((mappedCustomers ?? []).map((customer) => [customer.id, customer.name]));

  const ready =
    environment.missing.length === 0 &&
    environment.redirectUriValid &&
    environment.accountsUrlValid &&
    environment.encryptionKeyValid;
  const noticeText = notice ? ZOHO_NOTICES[notice] : null;
  const latest = runs?.[0];
  const summary = (latest?.summary ?? {}) as Record<string, number>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
          Zoho Books
        </h1>
        <p className="text-sm text-zinc-400 mt-2 max-w-3xl">
          Connect the existing Zoho Books organisation, preview customer matches, and enrich
          the current Nova Fire customers. This screen does not create invoices, estimates, or
          other financial records.
        </p>
      </div>

      {noticeText && !(notice === "config" && ready) && (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          {noticeText}
        </p>
      )}

      {migrationMissing && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Database migration <span className="font-mono">00017_zoho_books_integration.sql</span> has
          not been applied. Apply it in Supabase before connecting Zoho Books. No production data
          is changed by opening this page.
        </p>
      )}

      <section className={panelClass}>
        <h2 className="text-sm font-semibold text-white mb-3">Server configuration</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <Stat label="ZOHO_CLIENT_ID" value={environment.clientId ? "Present" : "Missing"} />
          <Stat label="ZOHO_CLIENT_SECRET" value={environment.clientSecret ? "Present" : "Missing"} />
          <Stat
            label="ZOHO_REDIRECT_URI"
            value={
              !environment.redirectUri
                ? "Missing"
                : environment.redirectUriValid
                  ? "Present"
                  : "Set, but not the callback URL"
            }
          />
          <Stat
            label="ZOHO_ACCOUNTS_URL"
            value={
              !environment.accountsUrl
                ? "Missing"
                : environment.accountsUrlValid
                  ? "Present"
                  : "Set, but not a Zoho accounts URL"
            }
          />
          <Stat
            label="ZOHO_TOKEN_ENCRYPTION_KEY"
            value={
              !environment.encryptionKey
                ? "Missing"
                : environment.encryptionKeyValid
                  ? "Present"
                  : "Set, but not a 32-byte key"
            }
          />
        </div>
        {environment.redirectUri && environment.redirectUriValid ? (
          <p className="text-xs text-zinc-400 mt-3 break-all">
            Zoho will be sent {environment.redirectUriValue}
            {environment.redirectUriUpgradedFromHttp
              ? ". The deployment value starts with http://, so the registered https:// callback is used."
              : "."}
          </p>
        ) : environment.redirectUri ? (
          <p className="text-xs text-amber-200 mt-3 break-all">
            {environment.redirectUriProblem}
          </p>
        ) : null}
      </section>

      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Connection</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Status: {connection?.status ?? "not connected"}
              {connection?.organization_name ? ` · ${connection.organization_name}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/api/integrations/zoho/connect" className={buttonClass}>
              {connection && connection.status !== "revoked" ? "Reconnect Zoho Books" : "Connect Zoho Books"}
            </a>
            {connection && connection.status !== "revoked" && (
              <form action={disconnectZoho}>
                <button className={secondaryClass} type="submit">
                  Disconnect
                </button>
              </form>
            )}
          </div>
        </div>
        {connection && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
            <Stat label="API domain" value={connection.api_domain ?? "Waiting for Zoho"} />
            <Stat label="Organisation ID" value={connection.organization_id ?? "Not selected"} />
            <Stat
              label="Last connection test"
              value={
                connection.last_connection_test_at
                  ? `${connection.last_connection_test_ok ? "Succeeded" : "Failed"} · ${new Date(connection.last_connection_test_at).toLocaleString("en-ZA")}`
                  : "Not tested"
              }
            />
            <Stat
              label="Last preview"
              value={connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString("en-ZA") : "None"}
            />
          </div>
        )}
        {connection?.last_error_message && (
          <p className="text-sm text-amber-200 mt-3">{connection.last_error_message}</p>
        )}
      </section>

      {connection && connection.status !== "revoked" && (
        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-white">Organisation</h2>
            <form action={refreshZohoOrganizations}>
              <button className={secondaryClass} type="submit">
                Reload organisations
              </button>
            </form>
          </div>
          {(organizations ?? []).length === 0 ? (
            <p className="text-sm text-zinc-400">No organisations have been stored yet.</p>
          ) : (
            <form action={selectZohoOrganization} className="space-y-3">
              <div className="space-y-2">
                {(organizations ?? []).map((organization) => (
                  <label key={organization.organization_id} className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                      type="radio"
                      name="organization_id"
                      value={organization.organization_id}
                      defaultChecked={organization.organization_id === connection.organization_id}
                      className="accent-red-600"
                    />
                    <span>
                      {organization.name}
                      <span className="text-zinc-500"> · {organization.organization_id}</span>
                    </span>
                  </label>
                ))}
              </div>
              <button className={buttonClass} type="submit">
                Use selected organisation
              </button>
            </form>
          )}
          <form action={testZohoConnection} className="mt-4">
            <button className={secondaryClass} type="submit" disabled={!ready}>
              Test connection
            </button>
          </form>
        </section>
      )}

      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Customer preview</h2>
            <p className="text-xs text-zinc-500 mt-1">
              A preview reads Zoho contacts and compares them with Nova Fire. It does not create
              or edit customers until an administrator applies an approved result.
            </p>
          </div>
          <form action={startZohoCustomerPreview}>
            <button
              className={buttonClass}
              type="submit"
              disabled={!connection?.last_connection_test_ok}
            >
              Start dry run
            </button>
          </form>
        </div>
        {latest && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
            <Stat label="Zoho contacts" value={summary.zohoContacts ?? "—"} />
            <Stat label="Verified matches" value={summary.verified ?? "—"} />
            <Stat label="Needs review" value={summary.needsReview ?? "—"} />
            <Stat label="Unmatched" value={summary.unmatched ?? "—"} />
          </div>
        )}
        <div className="mt-4 space-y-2">
          {(runs ?? []).map((run) => (
            <Link
              key={run.id}
              href={`/admin/integrations/zoho/${run.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/[0.03]"
            >
              <span className="text-white">
                {run.mode === "dry_run" ? "Preview" : "Apply"} · {run.status}
              </span>
              <span className="text-zinc-500">
                {new Date(run.started_at).toLocaleString("en-ZA")}
              </span>
            </Link>
          ))}
        </div>
        {latest?.error_message && <p className="text-sm text-amber-200 mt-3">{latest.error_message}</p>}
      </section>

      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Read-only accounting</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Items, estimates and invoices are retrieved for later quoting. Financial writes stay
              disabled.
            </p>
          </div>
          <form action={refreshZohoDocuments}>
            <button className={secondaryClass} type="submit">
              Refresh documents
            </button>
          </form>
        </div>
        {(documents ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No documents have been read yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-zinc-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Number</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Contact</th>
                  <th className="py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {(documents ?? []).map((document, index) => (
                  <tr key={`${document.document_type}-${document.document_number}-${index}`} className="border-t border-white/5">
                    <td className="py-2 pr-3 text-zinc-300">{document.document_type}</td>
                    <td className="py-2 pr-3 text-white">{document.document_number ?? "—"}</td>
                    <td className="py-2 pr-3 text-zinc-300">{document.document_status ?? "—"}</td>
                    <td className="py-2 pr-3 text-zinc-300">{document.contact_name ?? "—"}</td>
                    <td className="py-2 text-zinc-300">
                      {document.total === null || document.total === undefined
                        ? "—"
                        : `${document.currency_code ?? ""} ${document.total}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={panelClass}>
        <h2 className="text-sm font-semibold text-white mb-2">Mapped customers and recovery</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Removing a mapping does not delete the customer, sites, equipment, jobcards, inspections
          or defects. Name and billing corrections already applied stay in customer history and can
          be edited on the customer page.
        </p>
        {(mappingRows ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No Zoho Books contacts are mapped yet.</p>
        ) : (
          <div className="space-y-2">
            {(mappingRows ?? []).map((mapping) => {
              return (
                <div key={mapping.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="text-zinc-200">
                    {customerNameById.get(mapping.customer_id) ?? "Customer"}{" "}
                    <span className="text-zinc-500">
                      · Zoho {mapping.zoho_contact_id} · {mapping.match_method}
                    </span>
                  </p>
                  <form action={unlinkZohoCustomer}>
                    <input type="hidden" name="mapping_id" value={mapping.id} />
                    <button className={secondaryClass} type="submit">
                      Unlink
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

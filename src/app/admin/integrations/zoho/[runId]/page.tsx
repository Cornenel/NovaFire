import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ZohoCustomerLinkPicker } from "@/components/admin/zoho-customer-link-picker";
import {
  buildAdminListHref,
  parseAdminListParams,
  sanitizeSearchTerm,
} from "@/lib/admin/list-params";
import { ZOHO_NOTICES } from "@/lib/integrations/zoho/notices";
import type { FieldProposal } from "@/lib/integrations/zoho/types";
import { cn } from "@/lib/utils";
import {
  applyAllZohoChanges,
  saveZohoReviewDecision,
} from "../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata = { title: "Zoho Books preview | Nova Fire Admin" };

const buttonClass =
  "px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold";
const secondaryClass =
  "px-3 py-1.5 rounded-lg border border-white/10 text-xs text-zinc-200 hover:bg-white/5";

const ACTION_LABEL: Record<FieldProposal["action"], string> = {
  update: "Update from Zoho",
  add: "Fill missing",
  keep: "Keep",
  preserve: "Leave alone",
  conflict: "Conflict",
};

const ACTION_STYLE: Record<FieldProposal["action"], string> = {
  update: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  add: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  keep: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  preserve: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  conflict: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "verified_match", label: "Verified" },
  { key: "needs_review", label: "Needs review" },
  { key: "unmatched", label: "Unmatched" },
  { key: "conflict", label: "Conflicts" },
] as const;

type CategoryKey = (typeof CATEGORY_TABS)[number]["key"];

function categoryLabel(category: string): string {
  switch (category) {
    case "verified_match":
      return "Verified match";
    case "needs_review":
      return "Needs review";
    case "unmatched":
      return "Unmatched";
    case "conflict":
      return "Conflict";
    default:
      return category;
  }
}

export default async function ZohoPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{
    notice?: string;
    page?: string;
    q?: string;
    tab?: string;
  }>;
}) {
  const { runId } = await params;
  const raw = await searchParams;
  const notice = raw.notice;
  const tab = (CATEGORY_TABS.some((t) => t.key === raw.tab)
    ? raw.tab
    : "all") as CategoryKey;
  const { q, page, pageSize, from, to } = parseAdminListParams(raw);
  const search = sanitizeSearchTerm(q);

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

  const { data: run } = await supabase
    .from("zoho_books_sync_runs")
    .select(
      "id, status, mode, started_at, completed_at, summary, error_message, organization_id"
    )
    .eq("id", runId)
    .maybeSingle();
  if (!run) notFound();

  let countQuery = supabase
    .from("zoho_books_sync_items")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId);
  let listQuery = supabase
    .from("zoho_books_sync_items")
    .select(
      "id, zoho_contact_id, zoho_display_name, customer_id, customer_name_snapshot, category, match_method, confidence, candidates, proposed_changes, decision, apply_status, apply_error"
    )
    .eq("run_id", runId)
    .order("category")
    .order("zoho_display_name")
    .range(from, to);

  if (tab !== "all") {
    countQuery = countQuery.eq("category", tab);
    listQuery = listQuery.eq("category", tab);
  }
  if (search) {
    const pattern = `%${search}%`;
    countQuery = countQuery.ilike("zoho_display_name", pattern);
    listQuery = listQuery.ilike("zoho_display_name", pattern);
  }

  const [
    { data: items },
    { count: filteredCount },
    { count: pendingVerified },
    { count: pendingSaved },
  ] = await Promise.all([
    listQuery,
    countQuery,
    supabase
      .from("zoho_books_sync_items")
      .select("id", { count: "exact", head: true })
      .eq("run_id", runId)
      .eq("category", "verified_match")
      .eq("decision", "pending")
      .or("apply_status.is.null,apply_status.neq.applied"),
    supabase
      .from("zoho_books_sync_items")
      .select("id", { count: "exact", head: true })
      .eq("run_id", runId)
      .in("decision", ["link", "create_customer"])
      .or("apply_status.is.null,apply_status.neq.applied"),
  ]);

  const summary = (run.summary ?? {}) as Record<string, number>;
  const noticeText = notice ? ZOHO_NOTICES[notice] : null;
  const totalCount = filteredCount ?? 0;
  const readyCount = (pendingVerified ?? 0) + (pendingSaved ?? 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/integrations/zoho" className="text-sm text-zinc-500 hover:text-white">
        Zoho Books
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
            Compare Zoho customers
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
            Verified matches fill missing Nova Fire fields from Zoho Books (VAT, registration,
            billing address, email, phone, contact). Sites, assets and jobs stay on the same
            customer. Review the rest, then apply once.
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            {run.status} · {new Date(run.started_at).toLocaleString("en-ZA")}
          </p>
        </div>

        <form
          action={applyAllZohoChanges}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3 min-w-[240px]"
        >
          <input type="hidden" name="run_id" value={run.id} />
          <p className="text-sm text-white font-medium">
            Ready to apply: {readyCount}
          </p>
          <p className="text-xs text-zinc-500">
            {(pendingVerified ?? 0)} verified · {(pendingSaved ?? 0)} saved decisions
          </p>
          <label className="flex items-start gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              name="apply_conflicts"
              value="true"
              className="mt-0.5 accent-red-600"
            />
            Also overwrite conflicting email, phone and contact person (off by default —
            missing values are still filled)
          </label>
          <button className={buttonClass} type="submit" disabled={readyCount === 0}>
            Apply ready changes
          </button>
        </form>
      </div>

      {noticeText && (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          {noticeText}
        </p>
      )}
      {run.error_message && <p className="text-sm text-amber-200">{run.error_message}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {[
          ["Zoho contacts", summary.zohoContacts],
          ["Verified", summary.verified],
          ["Needs review", summary.needsReview],
          ["Unmatched", summary.unmatched],
          ["Last applied", summary.lastApplied ?? "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-white/10 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="text-sm text-white mt-1">{value ?? "—"}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_TABS.map((item) => (
          <Link
            key={item.key}
            href={buildAdminListHref(
              `/admin/integrations/zoho/${run.id}`,
              { q: search || undefined, tab: item.key === "all" ? undefined : item.key },
              { page: 1 }
            )}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              tab === item.key
                ? "bg-red-600/20 border-red-500/40 text-red-400"
                : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white"
            )}
          >
            {item.label}
            {item.key === "verified_match" && summary.verified != null
              ? ` (${summary.verified})`
              : ""}
            {item.key === "needs_review" && summary.needsReview != null
              ? ` (${summary.needsReview})`
              : ""}
            {item.key === "unmatched" && summary.unmatched != null
              ? ` (${summary.unmatched})`
              : ""}
          </Link>
        ))}
      </div>

      <AdminListToolbar
        action={`/admin/integrations/zoho/${run.id}`}
        q={search}
        placeholder="Search Zoho contact name…"
        hidden={{ tab: tab === "all" ? undefined : tab }}
      />

      <div className="space-y-4">
        {(items ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">
            {search || tab !== "all"
              ? "No contacts in this filter."
              : "No contacts in this preview."}
          </p>
        ) : (
          (items ?? []).map((item) => {
            const proposals = (
              Array.isArray(item.proposed_changes) ? item.proposed_changes : []
            ) as FieldProposal[];
            const visible = proposals.filter((proposal) => proposal.action !== "keep");
            const fillCount = visible.filter((p) => p.action === "add").length;
            const updateCount = visible.filter((p) => p.action === "update").length;
            const conflictCount = visible.filter((p) => p.action === "conflict").length;
            const candidates = (
              Array.isArray(item.candidates) ? item.candidates : []
            ) as Array<{
              customerId: string;
              customerName?: string;
              reason: string;
              score?: number;
            }>;

            return (
              <article
                key={item.id}
                className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      {item.zoho_display_name}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      {categoryLabel(item.category)}
                      {item.match_method ? ` · ${item.match_method}` : ""}
                      {item.confidence ? ` · ${item.confidence}` : ""}
                      {item.customer_name_snapshot
                        ? ` · Nova Fire: ${item.customer_name_snapshot}`
                        : ""}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {fillCount > 0 && (
                        <span className="text-emerald-400">{fillCount} missing field
                        {fillCount === 1 ? "" : "s"} to fill</span>
                      )}
                      {fillCount > 0 && updateCount > 0 ? " · " : ""}
                      {updateCount > 0 && (
                        <span className="text-sky-300">{updateCount} update
                        {updateCount === 1 ? "" : "s"}</span>
                      )}
                      {(fillCount > 0 || updateCount > 0) && conflictCount > 0
                        ? " · "
                        : ""}
                      {conflictCount > 0 && (
                        <span className="text-amber-300">
                          {conflictCount} conflict{conflictCount === 1 ? "" : "s"}
                        </span>
                      )}
                      {fillCount === 0 && updateCount === 0 && conflictCount === 0 && (
                        <span>No field changes proposed</span>
                      )}
                      {" · "}
                      {item.apply_status
                        ? item.apply_status
                        : `decision ${item.decision}`}
                    </p>
                    {item.apply_error && (
                      <p className="text-xs text-amber-200 mt-1">{item.apply_error}</p>
                    )}
                  </div>
                  {item.customer_id && (
                    <Link
                      href={`/admin/customers/${item.customer_id}`}
                      className="text-xs text-sky-300"
                    >
                      Open customer
                    </Link>
                  )}
                </div>

                {visible.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-left text-zinc-500">
                        <tr>
                          <th className="py-1 pr-3 font-medium">Field</th>
                          <th className="py-1 pr-3 font-medium">Nova Fire</th>
                          <th className="py-1 pr-3 font-medium">Zoho Books</th>
                          <th className="py-1 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((proposal) => (
                          <tr
                            key={proposal.field}
                            className="border-t border-white/5 align-top"
                          >
                            <td className="py-1.5 pr-3 text-zinc-300">
                              {proposal.label}
                            </td>
                            <td className="py-1.5 pr-3 text-white">
                              {proposal.existing ?? "Missing"}
                            </td>
                            <td className="py-1.5 pr-3 text-white">
                              {proposal.zoho ?? "Missing"}
                            </td>
                            <td className="py-1.5">
                              <span
                                className={cn(
                                  "inline-flex text-[10px] px-2 py-0.5 rounded-full border",
                                  ACTION_STYLE[proposal.action]
                                )}
                              >
                                {ACTION_LABEL[proposal.action]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {item.category !== "verified_match" &&
                  item.decision === "pending" &&
                  item.apply_status !== "applied" && (
                    <form action={saveZohoReviewDecision} className="space-y-3">
                      <input type="hidden" name="run_id" value={run.id} />
                      <input type="hidden" name="item_id" value={item.id} />
                      <ZohoCustomerLinkPicker initialCandidates={candidates} />
                      <label className="flex items-center gap-2 text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          name="confirm_distinct"
                          value="true"
                          className="accent-red-600"
                        />
                        I checked this is not an existing customer (required to create)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={secondaryClass}
                          name="decision"
                          value="link"
                          type="submit"
                        >
                          Link selected customer
                        </button>
                        <button
                          className={secondaryClass}
                          name="decision"
                          value="skip"
                          type="submit"
                        >
                          Skip
                        </button>
                        <button
                          className={secondaryClass}
                          name="decision"
                          value="create_customer"
                          type="submit"
                        >
                          Create new customer
                        </button>
                      </div>
                    </form>
                  )}
              </article>
            );
          })
        )}
      </div>

      <AdminPagination
        pathname={`/admin/integrations/zoho/${run.id}`}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        params={{ q: search || undefined, tab: tab === "all" ? undefined : tab }}
      />
    </div>
  );
}

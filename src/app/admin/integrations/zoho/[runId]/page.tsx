import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ZOHO_NOTICES } from "@/lib/integrations/zoho/notices";
import type { FieldProposal } from "@/lib/integrations/zoho/types";
import {
  applySavedZohoDecisions,
  applyVerifiedZohoMatches,
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
  update: "Update",
  add: "Add",
  keep: "Keep",
  preserve: "Preserve",
  conflict: "Review",
};

export default async function ZohoPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ notice?: string; page?: string }>;
}) {
  const { runId } = await params;
  const { notice, page } = await searchParams;
  const pageNumber = Math.max(Number(page ?? 1) || 1, 1);
  const pageSize = 25;
  const from = (pageNumber - 1) * pageSize;
  const to = from + pageSize - 1;

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
    .select("id, status, mode, started_at, completed_at, summary, error_message, organization_id")
    .eq("id", runId)
    .maybeSingle();
  if (!run) notFound();

  const { data: items } = await supabase
    .from("zoho_books_sync_items")
    .select(
      "id, zoho_contact_id, zoho_display_name, customer_id, customer_name_snapshot, category, match_method, confidence, candidates, proposed_changes, decision, apply_status, apply_error"
    )
    .eq("run_id", runId)
    .order("category")
    .order("zoho_display_name")
    .range(from, to);

  const summary = (run.summary ?? {}) as Record<string, number>;
  const noticeText = notice ? ZOHO_NOTICES[notice] : null;

  return (
    <div className="space-y-6">
      <Link href="/admin/integrations/zoho" className="text-sm text-zinc-500 hover:text-white">
        Zoho Books
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
            Customer preview
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            {run.status} · {new Date(run.started_at).toLocaleString("en-ZA")} · organisation{" "}
            {run.organization_id}
          </p>
        </div>
        <form action={applyVerifiedZohoMatches} className="space-y-2">
          <input type="hidden" name="run_id" value={run.id} />
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" name="apply_conflicts" value="true" className="accent-red-600" />
            Also replace conflicting email, phone and contact person values
          </label>
          <button className={buttonClass} type="submit">
            Apply verified matches
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
          ["Customers created during preview", summary.customersCreated ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-white/10 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="text-sm text-white mt-1">{value ?? "—"}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-500">
        Applying verified matches updates the existing customer row only. Site addresses, assets,
        inspections, jobcards, defects and portal access stay linked to the same customer id.
        Unmatched Zoho contacts are not created unless you explicitly approve a new customer below.
      </p>

      <div className="space-y-4">
        {(items ?? []).map((item) => {
          const proposals = (Array.isArray(item.proposed_changes)
            ? item.proposed_changes
            : []) as FieldProposal[];
          const visible = proposals.filter((proposal) => proposal.action !== "keep");
          const candidates = (Array.isArray(item.candidates) ? item.candidates : []) as Array<{
            customerId: string;
            customerName?: string;
            reason: string;
          }>;
          return (
            <article key={item.id} className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">{item.zoho_display_name}</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    {item.category} · {item.match_method ?? "no method"} · {item.confidence ?? "none"}
                    {item.customer_name_snapshot ? ` · Nova Fire: ${item.customer_name_snapshot}` : ""}
                    {item.apply_status ? ` · ${item.apply_status}` : ` · decision ${item.decision}`}
                  </p>
                  {item.apply_error && <p className="text-xs text-amber-200 mt-1">{item.apply_error}</p>}
                </div>
                {item.customer_id && (
                  <Link href={`/admin/customers/${item.customer_id}`} className="text-xs text-sky-300">
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
                        <th className="py-1 font-medium">Proposed action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((proposal) => (
                        <tr key={proposal.field} className="border-t border-white/5 align-top">
                          <td className="py-1.5 pr-3 text-zinc-300">{proposal.label}</td>
                          <td className="py-1.5 pr-3 text-white">{proposal.existing ?? "Missing"}</td>
                          <td className="py-1.5 pr-3 text-white">{proposal.zoho ?? "Missing"}</td>
                          <td className="py-1.5 text-zinc-300">{ACTION_LABEL[proposal.action]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {item.category !== "verified_match" && item.decision === "pending" && (
                <form action={saveZohoReviewDecision} className="space-y-2">
                  <input type="hidden" name="run_id" value={run.id} />
                  <input type="hidden" name="item_id" value={item.id} />
                  {candidates.length > 0 && (
                    <div className="space-y-1">
                      {candidates.map((candidate) => (
                        <label key={candidate.customerId} className="flex items-center gap-2 text-xs text-zinc-300">
                          <input type="radio" name="customer_id" value={candidate.customerId} className="accent-red-600" />
                          Link {candidate.customerName ?? candidate.customerId}
                          <span className="text-zinc-500">· {candidate.reason}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <label className="block text-xs text-zinc-400">
                    Or paste an existing customer id
                    <input
                      name="customer_id_manual"
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-[#171717] border border-white/10 text-white text-sm"
                      placeholder="Customer UUID"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input type="checkbox" name="confirm_distinct" value="true" className="accent-red-600" />
                    I have checked this is not an existing customer
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button className={secondaryClass} name="decision" value="link" type="submit">
                      Link selected customer
                    </button>
                    <button className={secondaryClass} name="decision" value="skip" type="submit">
                      Skip
                    </button>
                    <button className={secondaryClass} name="decision" value="create_customer" type="submit">
                      Create new customer
                    </button>
                  </div>
                </form>
              )}
            </article>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/admin/integrations/zoho/${run.id}?page=${Math.max(pageNumber - 1, 1)}`}
          className="text-sm text-zinc-400"
        >
          Previous
        </Link>
        <form action={applySavedZohoDecisions}>
          <input type="hidden" name="run_id" value={run.id} />
          <button className={buttonClass} type="submit">
            Apply saved decisions
          </button>
        </form>
        <Link href={`/admin/integrations/zoho/${run.id}?page=${pageNumber + 1}`} className="text-sm text-zinc-400">
          Next
        </Link>
      </div>
    </div>
  );
}

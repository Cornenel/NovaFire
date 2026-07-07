import { createClient } from "@/lib/supabase/server";
import { requirePortalSession } from "@/lib/portal/session";

export default async function PortalProfilePage() {
  const session = await requirePortalSession();
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name")
    .eq("customer_id", session.customer.id);

  const scopedSite = session.siteScopeId
    ? (sites ?? []).find((s) => s.id === session.siteScopeId)
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-6">
        Your profile
      </h1>
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel divide-y divide-white/5">
        <Row label="Name" value={session.profile.full_name} />
        <Row label="Email" value={session.profile.email} />
        <Row label="Phone" value={session.profile.phone} />
        <Row label="Customer" value={session.customer.name} />
        <Row
          label="Portal scope"
          value={scopedSite ? scopedSite.name : "All sites for this customer"}
        />
        <Row
          label="Last login"
          value={
            session.profile.last_portal_login_at
              ? new Date(session.profile.last_portal_login_at).toLocaleString("en-ZA", {
                  timeZone: "Africa/Johannesburg",
                })
              : "First visit"
          }
        />
      </div>
      <div className="mt-6 rounded-xl border border-white/[0.08] nf-glass-panel p-4 text-sm text-zinc-500">
        Profile details are read-only. Contact Nova Fire to update your account
        or company information.
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-200 text-right">{value ?? "—"}</span>
    </div>
  );
}

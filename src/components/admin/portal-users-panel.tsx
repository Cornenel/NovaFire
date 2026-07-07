import { createAdminClient } from "@/lib/supabase/admin";
import {
  invitePortalUser,
  setPortalUserAccess,
  updatePortalUserSiteScope,
} from "@/app/admin/portal-user-actions";

type PortalUser = {
  id: string;
  full_name: string;
  email: string | null;
  portal_site_id: string | null;
  portal_access_enabled: boolean;
  last_portal_login_at: string | null;
  is_active: boolean;
};

type SiteOption = { id: string; name: string };

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 text-sm focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20";

function fmtWhen(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function PortalUsersPanel({
  customerId,
  sites,
  error,
}: {
  customerId: string;
  sites: SiteOption[];
  error?: string | null;
}) {
  let users: PortalUser[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(
        "id, full_name, email, portal_site_id, portal_access_enabled, last_portal_login_at, is_active"
      )
      .eq("customer_id", customerId)
      .eq("role", "client")
      .order("full_name");
    users = (data ?? []) as PortalUser[];
  } catch {
    users = [];
  }

  return (
    <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-4">
      <h2 className="text-sm font-semibold text-zinc-300 mb-1">
        Customer Portal Users
      </h2>
      <p className="text-xs text-zinc-500 mb-4">
        Invite users who can sign in to view this customer&apos;s sites, assets,
        compliance, reports and defects.
      </p>

      {error ? (
        <p className="text-sm text-red-400 mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          {error}
        </p>
      ) : null}

      {users.length === 0 ? (
        <p className="text-sm text-zinc-500 mb-4">No portal users yet.</p>
      ) : (
        <div className="space-y-3 mb-6">
          {users.map((user) => {
            const scopedSite = sites.find((s) => s.id === user.portal_site_id);
            return (
              <div
                key={user.id}
                className="rounded-lg border border-white/[0.06] px-3 py-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{user.full_name}</p>
                    <p className="text-xs text-zinc-500">{user.email ?? "No email"}</p>
                    <p className="text-xs text-zinc-600 mt-1">
                      Last login: {fmtWhen(user.last_portal_login_at)}
                    </p>
                    <p className="text-xs text-zinc-600">
                      Scope: {scopedSite ? scopedSite.name : "All sites"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        user.portal_access_enabled && user.is_active
                          ? "text-[10px] px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                          : "text-[10px] px-2 py-0.5 rounded-full border bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                      }
                    >
                      {user.portal_access_enabled && user.is_active
                        ? "Access enabled"
                        : "Access disabled"}
                    </span>
                    <form action={setPortalUserAccess}>
                      <input type="hidden" name="profile_id" value={user.id} />
                      <input type="hidden" name="customer_id" value={customerId} />
                      <input
                        type="hidden"
                        name="enabled"
                        value={user.portal_access_enabled ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5"
                      >
                        {user.portal_access_enabled ? "Disable" : "Enable"}
                      </button>
                    </form>
                  </div>
                </div>
                <form action={updatePortalUserSiteScope} className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input type="hidden" name="profile_id" value={user.id} />
                  <input type="hidden" name="customer_id" value={customerId} />
                  <select
                    name="portal_site_id"
                    defaultValue={user.portal_site_id ?? ""}
                    className={inputCls}
                  >
                    <option value="">All sites</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="text-xs px-3 py-2 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 shrink-0"
                  >
                    Update site scope
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      <form action={invitePortalUser} className="space-y-3 border-t border-white/5 pt-4">
        <input type="hidden" name="customer_id" value={customerId} />
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Invite portal user
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input name="first_name" placeholder="First name" required className={inputCls} />
          <input name="last_name" placeholder="Last name" required className={inputCls} />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className={`${inputCls} sm:col-span-2`}
          />
          <input name="phone" placeholder="Phone (optional)" className={inputCls} />
          <select name="portal_site_id" className={inputCls} defaultValue="">
            <option value="">All sites (customer-wide)</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                Restrict to: {site.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
        >
          Send invite
        </button>
      </form>
    </div>
  );
}

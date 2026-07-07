import Link from "next/link";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requirePortalSession } from "@/lib/portal/session";
import { loadPortalSites } from "@/lib/portal/queries";

export default async function PortalSitesPage() {
  const session = await requirePortalSession();
  const supabase = await createClient();
  const sites = await loadPortalSites(supabase, session);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-6">
        Sites
      </h1>
      {sites.length === 0 ? (
        <p className="text-sm text-zinc-500">No sites available.</p>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <Link
              key={site.id}
              href={`/client-portal/sites/${site.id}`}
              className="block rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-4 hover:bg-white/[0.02]"
            >
              <p className="text-white font-medium">{site.name}</p>
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {site.address}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

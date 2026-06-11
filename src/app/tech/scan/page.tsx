import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { QrScanner } from "@/components/tech/qr-scanner";

/**
 * QR scan / asset lookup.
 * ?code= accepts a QR token (uuid) or the printed asset code (e.g. NF-A-00042).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  let notFoundCode: string | null = null;

  if (code) {
    const supabase = await createClient();
    const cleaned = code.trim();
    const query = supabase.from("assets").select("id");

    const { data } = UUID_RE.test(cleaned)
      ? await query.eq("qr_token", cleaned).maybeSingle()
      : await query.ilike("asset_code", cleaned).maybeSingle();

    if (data) redirect(`/tech/assets/${data.id}`);
    notFoundCode = cleaned;
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.2em] mb-1">
          Asset Lookup
        </p>
        <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
          Scan QR Code
        </h1>
      </div>

      <QrScanner />

      {notFoundCode && (
        <p className="text-sm text-red-400 mt-4">
          No asset found for “{notFoundCode}”. Check the code and try again.
        </p>
      )}

      <div className="mt-6">
        <p className="text-sm text-zinc-400 mb-2">Or enter the asset ID:</p>
        <form action="/tech/scan" className="flex gap-2">
          <input
            type="text"
            name="code"
            placeholder="NF-A-00042"
            autoCapitalize="characters"
            autoComplete="off"
            className="flex-1 px-4 py-3 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 font-mono focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <button
            type="submit"
            className="px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition-colors"
            aria-label="Look up asset"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

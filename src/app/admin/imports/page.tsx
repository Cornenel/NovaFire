import Link from "next/link";
import { FileUp } from "lucide-react";

export const metadata = { title: "Imports | NovaFire Admin" };

export default function ImportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-1">
        Imports
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Safe, create-only import tools for legacy data.
      </p>

      <Link
        href="/admin/imports/zoho-jobcard"
        className="block rounded-xl border border-white/[0.08] nf-glass-panel p-4 hover:bg-white/[0.03] transition-colors max-w-lg"
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-400">
            <FileUp className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Zoho Jobcard Import</p>
            <p className="text-xs text-zinc-500">
              Upload old Zoho Jobcard report CSV files and preview before importing.
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, FileUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ZohoJobcardImporter } from "@/components/admin/zoho-jobcard-importer";
import { cn } from "@/lib/utils";

export const metadata = { title: "Zoho Jobcard Import | NovaFire Admin" };

export default async function ZohoJobcardImportPage() {
  const supabase = await createClient();
  const { data: sessionsData } = await supabase
    .from("import_sessions")
    .select("id, filename, status, total_rows, valid_rows, warning_rows, duplicate_rows, summary, created_at, completed_at")
    .eq("import_type", "zoho_jobcard")
    .order("created_at", { ascending: false })
    .limit(10);

  const sessions = (sessionsData ?? []) as Array<{
    id: string;
    filename: string | null;
    status: string;
    total_rows: number;
    valid_rows: number;
    warning_rows: number;
    duplicate_rows: number;
    summary: Record<string, unknown> | null;
    created_at: string;
    completed_at: string | null;
  }>;

  return (
    <div>
      <Link
        href="/admin/imports"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Imports
      </Link>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-1">
          <FileUp className="w-6 h-6 text-red-500" />
          Zoho Jobcard Import
        </h1>
        <p className="text-sm text-zinc-500 max-w-3xl">
          Import legacy Zoho Jobcard CSVs into customers, sites, completed
          jobs, assets, inspections and defects. The default mode is create-only
          with duplicate detection and raw-row audit logs.
        </p>
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-8">
        <ZohoJobcardImporter />

        <aside>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Previous Import Sessions
          </h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No Zoho import sessions recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm text-white truncate">
                      {session.filename ?? "Zoho CSV"}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border",
                        session.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : session.status === "failed"
                            ? "bg-red-500/15 text-red-400 border-red-500/30"
                            : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      )}
                    >
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {session.valid_rows} mapped rows / {session.total_rows} CSV rows
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {session.warning_rows} warnings · {session.duplicate_rows} duplicates
                  </p>
                  <p className="text-[10px] text-zinc-700 font-mono mt-2">
                    {new Date(session.created_at).toLocaleString("en-ZA")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

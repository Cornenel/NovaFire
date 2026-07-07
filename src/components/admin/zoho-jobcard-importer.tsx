"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload, X } from "lucide-react";
import {
  confirmZohoJobcardImport,
  previewZohoJobcardImport,
  type ZohoImportActionState,
} from "@/app/admin/imports/zoho-jobcard/actions";
import { cn } from "@/lib/utils";

const initialState: ZohoImportActionState = { ok: false };

export function ZohoJobcardImporter() {
  const [previewState, previewAction, previewPending] = useActionState(
    previewZohoJobcardImport,
    initialState
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmZohoJobcardImport,
    initialState
  );
  const [cancelled, setCancelled] = useState(false);

  const preview = !cancelled ? previewState.preview : undefined;
  const payload = useMemo(() => (preview ? JSON.stringify(preview) : ""), [preview]);

  function downloadValidationReport() {
    if (!preview) return;
    const blob = new Blob([JSON.stringify(preview, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${previewState.filename ?? "zoho-jobcard"}-validation-report.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <form
        action={previewAction}
        onSubmit={() => setCancelled(false)}
        className="rounded-xl border border-white/[0.08] nf-glass-panel p-4 space-y-4"
      >
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">
            Upload Zoho Jobcard CSV
          </label>
          <input
            type="file"
            name="csv"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-red-500"
          />
          <p className="text-xs text-zinc-600 mt-2">
            Preview is dry-run only. Confirm Import creates records using create-only,
            idempotent matching.
          </p>
        </div>
        <button
          type="submit"
          disabled={previewPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {previewPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Parse & Preview
        </button>
      </form>

      {(previewState.error || confirmState.error) && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">
            {confirmState.error ?? previewState.error}
          </p>
        </div>
      )}

      {confirmState.result && (
        <ResultPanel result={confirmState.result} />
      )}

      {preview && (
        <div className="space-y-6">
          <SummaryCards preview={preview} />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadValidationReport}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download validation report
            </button>
            <button
              type="button"
              onClick={() => setCancelled(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel import
            </button>
            <form action={confirmAction}>
              <input type="hidden" name="filename" value={previewState.filename ?? ""} />
              <textarea name="payload" readOnly hidden value={payload} />
              <button
                type="submit"
                disabled={confirmPending || preview.equipment.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {confirmPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Confirm Import
              </button>
            </form>
          </div>

          <PreviewTable preview={preview} />
          <WarningsList preview={preview} />
        </div>
      )}
    </div>
  );
}

function SummaryCards({ preview }: { preview: NonNullable<ZohoImportActionState["preview"]> }) {
  const validation = preview.validation;
  const cards = [
    ["Jobcards", validation.jobcards_created],
    ["Portable assets", validation.portable_assets_imported],
    ["Fixed assets", validation.fixed_assets_imported],
    ["Service records", validation.service_records_created],
    ["Pressure tests due", validation.pressure_tests_required],
    ["Parts used", validation.parts_used_records_created],
    ["Quote required", validation.quote_required_records_created],
    ["Duplicates skipped", validation.duplicate_rows_skipped],
    ["Errors", validation.errors.length],
  ] as const;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-white/[0.08] nf-glass-panel px-4 py-3"
        >
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

function PreviewTable({ preview }: { preview: NonNullable<ZohoImportActionState["preview"]> }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-300 mb-3">
        Jobcard Preview ({preview.jobs.length})
      </h2>
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-xs text-zinc-500">
              <tr>
                <th className="text-left font-medium px-4 py-3">Jobcard ID</th>
                <th className="text-left font-medium px-4 py-3">Customer</th>
                <th className="text-left font-medium px-4 py-3">Contact</th>
                <th className="text-left font-medium px-4 py-3">Date</th>
                <th className="text-left font-medium px-4 py-3">Technician</th>
                <th className="text-right font-medium px-4 py-3">Portable</th>
                <th className="text-right font-medium px-4 py-3">Fixed</th>
                <th className="text-right font-medium px-4 py-3">Defects</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {preview.jobs.map((job) => (
                <tr key={job.legacyZohoJobcardId}>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {job.legacyZohoJobcardId}
                  </td>
                  <td className="px-4 py-3 text-white">{job.customerName ?? "-"}</td>
                  <td className="px-4 py-3 text-zinc-400">{job.contactName ?? "-"}</td>
                  <td className="px-4 py-3 text-zinc-400">{job.date ?? "-"}</td>
                  <td className="px-4 py-3 text-zinc-400">{job.technicianName ?? "-"}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{job.portableAssets}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{job.fixedAssets}</td>
                  <td className="px-4 py-3 text-right text-amber-300">{job.likelyDefects}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border",
                        job.status === "ready"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : job.status === "warning"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-red-500/15 text-red-400 border-red-500/30"
                      )}
                    >
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WarningsList({ preview }: { preview: NonNullable<ZohoImportActionState["preview"]> }) {
  const warnings = preview.warnings.slice(0, 80);
  if (warnings.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-amber-300 mb-3">
        Warnings ({preview.warnings.length})
      </h2>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] divide-y divide-amber-500/10">
        {warnings.map((warning, index) => (
          <div key={`${warning.code}-${index}`} className="px-4 py-2.5">
            <p className="text-sm text-amber-100">
              {warning.csvRowNumber ? `Row ${warning.csvRowNumber}: ` : ""}
              {warning.message}
            </p>
            <p className="text-[10px] uppercase font-mono text-amber-500/70">
              {warning.code}
            </p>
          </div>
        ))}
      </div>
      {preview.warnings.length > warnings.length && (
        <p className="text-xs text-zinc-600 mt-2">
          Download the validation report to view all warnings.
        </p>
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: NonNullable<ZohoImportActionState["result"]> }) {
  const validation = result.validation;
  const rows = [
    ["Customers created", result.customersCreated],
    ["Customers matched", result.customersMatched],
    ["Jobs created", result.jobsCreated],
    ["Jobs matched", result.jobsMatched],
    ["Assets created", result.assetsCreated],
    ["Assets matched", result.assetsMatched],
    ["Inspections created", result.inspectionsCreated],
    ["Defects created", result.defectsCreated],
    ["Portable assets", validation.portable_assets_imported],
    ["Fixed assets", validation.fixed_assets_imported],
    ["Pressure tests due", validation.pressure_tests_required],
    ["Parts used", validation.parts_used_records_created],
    ["Quote required", validation.quote_required_records_created],
    ["Duplicates skipped", validation.duplicate_rows_skipped],
    ["Skipped rows", result.skippedRows],
    ["Warning rows", result.warningRows],
  ] as const;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-300 mb-3">
        <CheckCircle2 className="w-4 h-4" />
        Import completed
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-zinc-600 mt-3 font-mono">
        Session: {result.sessionId}
      </p>
    </div>
  );
}

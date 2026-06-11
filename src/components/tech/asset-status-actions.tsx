"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Droplets, RefreshCw, Trash2, HelpCircle, Loader2 } from "lucide-react";
import { runOrQueue } from "@/lib/offline/outbox";
import { getLocalUserId } from "@/lib/offline/operations";
import { addMonths, todayInSA } from "@/lib/fsm/dates";

type AssetAction = "refilled" | "replaced" | "removed" | "marked_missing";

const ACTION_TO_STATUS: Record<AssetAction, string> = {
  refilled: "compliant",
  replaced: "replaced",
  removed: "removed",
  marked_missing: "missing",
};

const ACTIONS: {
  action: AssetAction;
  label: string;
  confirm: string;
  icon: typeof Droplets;
}[] = [
  {
    action: "refilled",
    label: "Refilled",
    confirm: "Mark this asset as refilled? Service dates will be updated.",
    icon: Droplets,
  },
  {
    action: "replaced",
    label: "Replaced",
    confirm: "Mark this asset as replaced?",
    icon: RefreshCw,
  },
  {
    action: "removed",
    label: "Removed",
    confirm: "Mark this asset as removed from site?",
    icon: Trash2,
  },
  {
    action: "marked_missing",
    label: "Missing",
    confirm: "Mark this asset as missing?",
    icon: HelpCircle,
  },
];

export function AssetStatusActions({
  assetId,
  jobId,
}: {
  assetId: string;
  jobId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<AssetAction | null>(null);
  const isPending = pendingAction !== null;

  async function run(action: AssetAction, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setError("");
    setNote("");
    setPendingAction(action);

    const technicianId = await getLocalUserId();
    if (!technicianId) {
      setError("Session expired – please sign in again.");
      setPendingAction(null);
      return;
    }

    const fields: Record<string, string | null> = {
      status: ACTION_TO_STATUS[action],
    };
    if (action === "refilled") {
      const today = todayInSA();
      fields.last_service_date = today;
      fields.next_service_date = addMonths(today, 12);
    }

    const res = await runOrQueue({
      type: "asset_action",
      payload: { assetId, jobId, technicianId, action, fields },
    });

    setPendingAction(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.queued) {
      setNote("Saved on this device – will sync when signal returns.");
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5">
        {ACTIONS.map((a) => (
          <button
            key={a.action}
            onClick={() => run(a.action, a.confirm)}
            disabled={isPending}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] transition-colors disabled:opacity-50 text-xs font-medium"
          >
            {pendingAction === a.action ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <a.icon className="w-4 h-4" />
            )}
            {a.label}
          </button>
        ))}
      </div>
      {note && <p className="text-xs text-zinc-500 mt-2">{note}</p>}
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}

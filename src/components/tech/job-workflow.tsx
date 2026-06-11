"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  MapPin,
  CheckCircle2,
  PackageX,
  Package,
  Loader2,
} from "lucide-react";
import { runOrQueue } from "@/lib/offline/outbox";
import type { JobStatus } from "@/lib/fsm/types";

/**
 * Job workflow actions: Start Travel → Check In (GPS) → Sign Off / Awaiting
 * Parts. Works offline – changes queue locally and sync automatically.
 */

function getPosition(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}

export function JobWorkflow({
  jobId,
  status: initialStatus,
}: {
  jobId: string;
  status: JobStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<JobStatus>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function transition(
    nextStatus: JobStatus,
    fields: Record<string, string | number | null>
  ) {
    setError("");
    setNote("");
    setBusy(true);
    const result = await runOrQueue({
      type: "job_status",
      payload: { jobId, fields: { status: nextStatus, ...fields } },
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus(nextStatus);
    if (result.queued) {
      setNote("Saved on this device – will sync when signal returns.");
    } else {
      router.refresh();
    }
  }

  async function handleCheckIn() {
    setNote("Getting GPS location…");
    const coords = await getPosition();
    await transition("on_site", {
      checked_in_at: new Date().toISOString(),
      checkin_latitude: coords?.latitude ?? null,
      checkin_longitude: coords?.longitude ?? null,
    });
  }

  const baseBtn =
    "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-2">
      {status === "not_started" && (
        <button
          onClick={() =>
            transition("travelling", {
              travel_started_at: new Date().toISOString(),
            })
          }
          disabled={busy}
          className={`${baseBtn} bg-amber-600 hover:bg-amber-500 text-white`}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Truck className="w-4 h-4" />
          )}
          Start Travel
        </button>
      )}

      {(status === "travelling" || status === "not_started") && (
        <button
          onClick={handleCheckIn}
          disabled={busy}
          className={`${baseBtn} ${
            status === "travelling"
              ? "bg-sky-600 hover:bg-sky-500 text-white"
              : "bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10"
          }`}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
          Check In On Site
        </button>
      )}

      {status === "awaiting_parts" && (
        <button
          onClick={handleCheckIn}
          disabled={busy}
          className={`${baseBtn} bg-sky-600 hover:bg-sky-500 text-white`}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
          Back On Site
        </button>
      )}

      {status === "on_site" && (
        <>
          <Link
            href={`/tech/jobs/${jobId}/complete`}
            className={`${baseBtn} bg-emerald-600 hover:bg-emerald-500 text-white`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Sign Off & Complete
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/tech/jobs/${jobId}/stock`}
              className={`${baseBtn} bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10`}
            >
              <Package className="w-4 h-4" />
              Use Stock
            </Link>
            <button
              onClick={() => transition("awaiting_parts", {})}
              disabled={busy}
              className={`${baseBtn} bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10`}
            >
              <PackageX className="w-4 h-4" />
              Awaiting Parts
            </button>
          </div>
        </>
      )}

      {status === "completed" && (
        <p className="text-sm text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Job completed
        </p>
      )}

      {note && <p className="text-xs text-zinc-500">{note}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

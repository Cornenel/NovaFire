"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { runOrQueue } from "@/lib/offline/outbox";
import { SignaturePad } from "./signature-pad";

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
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}

export function CompleteJobForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [signature, setSignature] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = signerName.trim().length > 1 && signature !== null;

  async function handleSubmit() {
    if (!signature) return;
    setError("");
    setSubmitting(true);

    const coords = await getPosition();
    const now = new Date().toISOString();

    const res = await runOrQueue({
      type: "signature_complete",
      payload: {
        jobId,
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim() || null,
        storagePath: `${jobId}/${crypto.randomUUID()}.png`,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        signedAt: now,
        completedAt: now,
        blob: signature,
      },
    });

    if (res.error) {
      setError(res.error);
      setSubmitting(false);
      return;
    }

    router.push(`/tech/jobs/${jobId}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-zinc-400 mb-2">
          Customer name
        </label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Full name of person signing"
          className="w-full px-4 py-3 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-2">
          Title / role (optional)
        </label>
        <input
          type="text"
          value={signerTitle}
          onChange={(e) => setSignerTitle(e.target.value)}
          placeholder="e.g. Duty Manager"
          className="w-full px-4 py-3 rounded-lg bg-[#171717] border border-white/10 text-white placeholder-zinc-600 focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        />
      </div>

      <SignaturePad onChange={setSignature} />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CheckCircle2 className="w-4 h-4" />
        )}
        Sign Off & Complete Job
      </button>
      <p className="text-[11px] text-zinc-600 text-center">
        Signature is stored with name, date, time and GPS location.
      </p>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, CheckCircle2, XCircle, CloudUpload } from "lucide-react";
import { runOrQueue } from "@/lib/offline/outbox";
import { getLocalUserId } from "@/lib/offline/operations";
import type { PhotoStage } from "@/lib/fsm/types";
import { cn } from "@/lib/utils";

/**
 * Photo evidence upload – stores the image in the private `job-photos`
 * bucket and records a row in `photos` linked to job / asset / defect /
 * inspection / technician with timestamp and GPS (when available).
 * Works offline: photos queue on-device and upload when signal returns.
 */

interface UploadItem {
  id: string;
  previewUrl: string;
  status: "uploading" | "done" | "queued" | "error";
}

const STAGES: { value: PhotoStage; label: string }[] = [
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "general", label: "General" },
];

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

export function PhotoUpload({
  jobId,
  assetId,
  defectId,
  inspectionId,
  onUploaded,
}: {
  jobId: string;
  assetId?: string;
  defectId?: string;
  inspectionId?: string;
  onUploaded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<PhotoStage>("before");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");

    const technicianId = await getLocalUserId();
    if (!technicianId) {
      setError("Session expired – please sign in again.");
      return;
    }

    const coords = await getPosition();

    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setItems((prev) => [...prev, { id, previewUrl, status: "uploading" }]);

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const storagePath = `${jobId}/${id}.${ext}`;

      const res = await runOrQueue({
        type: "photo",
        payload: {
          id,
          jobId,
          assetId: assetId ?? null,
          defectId: defectId ?? null,
          inspectionId: inspectionId ?? null,
          technicianId,
          storagePath,
          stage,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          takenAt: new Date().toISOString(),
          blob: file,
          contentType: file.type || "image/jpeg",
        },
      });

      if (res.error) {
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, status: "error" } : it))
        );
        setError(res.error);
        continue;
      }
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, status: res.queued ? "queued" : "done" } : it
        )
      );
      onUploaded?.();
    }
  }

  return (
    <div className="space-y-3">
      {/* Stage selector */}
      <div className="grid grid-cols-3 gap-1.5">
        {STAGES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStage(s.value)}
            className={cn(
              "py-2 rounded-lg text-sm font-medium border transition-colors",
              stage === s.value
                ? "bg-red-600/20 border-red-500/40 text-red-400"
                : "bg-white/[0.03] border-white/10 text-zinc-400"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-zinc-300 font-medium hover:bg-white/[0.05] transition-colors"
      >
        <Camera className="w-4 h-4" />
        Take / Choose Photo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {items.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt="Photo evidence"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 right-1">
                {item.status === "uploading" && (
                  <Loader2 className="w-4 h-4 text-white animate-spin drop-shadow" />
                )}
                {item.status === "done" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow" />
                )}
                {item.status === "queued" && (
                  <CloudUpload className="w-4 h-4 text-amber-400 drop-shadow" />
                )}
                {item.status === "error" && (
                  <XCircle className="w-4 h-4 text-red-400 drop-shadow" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

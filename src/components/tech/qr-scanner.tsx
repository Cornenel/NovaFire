"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff } from "lucide-react";

/**
 * QR scanner using the native BarcodeDetector API (Chrome/Edge/Android).
 * Falls back to the manual code entry form rendered by the scan page.
 */

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: {
      formats: string[];
    }) => BarcodeDetectorLike;
  }
}

export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!window.BarcodeDetector);
    return stop;
  }, [stop]);

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const value = codes[0].rawValue;
            // QR may contain a raw token or a URL ending in the token
            const uuidMatch = value.match(
              /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
            );
            const code = uuidMatch ? uuidMatch[0] : value;
            stop();
            router.push(`/tech/scan?code=${encodeURIComponent(code)}`);
            return;
          }
        } catch {
          // detection failures are transient – keep scanning
        }
        if (streamRef.current) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      setError("Camera access denied or unavailable. Enter the asset ID below.");
      stop();
    }
  }

  if (supported === false) {
    return (
      <div className="rounded-xl border border-white/[0.08] nf-glass-panel p-5 text-center">
        <CameraOff className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">
          Camera scanning isn&apos;t supported in this browser.
        </p>
        <p className="text-xs text-zinc-600 mt-1">
          Enter the asset ID printed on the label below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-black aspect-square">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <button
              onClick={start}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
            >
              <Camera className="w-4 h-4" />
              Start Camera
            </button>
            <p className="text-xs text-zinc-500">Point at an asset QR code</p>
          </div>
        )}
        {scanning && (
          <div className="absolute inset-8 border-2 border-red-500/60 rounded-xl pointer-events-none" />
        )}
      </div>
      {error && <p className="text-sm text-amber-400">{error}</p>}
    </div>
  );
}

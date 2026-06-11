"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, WifiOff } from "lucide-react";
import { processOutbox, subscribeOutbox } from "@/lib/offline/outbox";

/**
 * Registers the service worker, watches connectivity and the offline
 * outbox, auto-syncs when signal returns, and shows a status banner.
 */

export function OfflineStatus() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const unsubscribe = subscribeOutbox((count, isSyncing) => {
      setPending((prev) => {
        if (prev > 0 && count === 0 && !isSyncing) {
          // Queue just drained – refresh server-rendered data
          router.refresh();
        }
        return count;
      });
      setSyncing(isSyncing);
    });

    const handleOnline = () => {
      setOnline(true);
      void processOutbox();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Sync on load + periodically as a safety net
    void processOutbox();
    const interval = setInterval(() => void processOutbox(), 60_000);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [router]);

  if (online && pending === 0) return null;

  return (
    <div
      className={
        online
          ? "sticky top-[57px] z-30 bg-sky-600/15 border-b border-sky-500/20"
          : "sticky top-[57px] z-30 bg-amber-600/15 border-b border-amber-500/20"
      }
    >
      <div className="max-w-md mx-auto px-4 py-2 flex items-center gap-2">
        {online ? (
          <CloudUpload className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        )}
        <p className={online ? "text-xs text-sky-300" : "text-xs text-amber-300"}>
          {!online && pending === 0 && "Offline – work is saved on this device"}
          {!online &&
            pending > 0 &&
            `Offline – ${pending} change${pending > 1 ? "s" : ""} queued, will sync automatically`}
          {online &&
            pending > 0 &&
            (syncing
              ? `Syncing ${pending} change${pending > 1 ? "s" : ""}…`
              : `${pending} change${pending > 1 ? "s" : ""} waiting to sync`)}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

/**
 * Warms the service worker page cache with today's job and asset pages so
 * technicians can keep working in dead zones.
 */

export function OfflinePrefetch({ urls }: { urls: string[] }) {
  const key = urls.join("|");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.onLine) return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      // Wait for the service worker to control the page so fetches get cached
      await navigator.serviceWorker.ready.catch(() => {});
      for (const url of key.split("|").filter(Boolean)) {
        if (cancelled) return;
        try {
          await fetch(url, { credentials: "same-origin" });
        } catch {
          return; // went offline mid-prefetch
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return null;
}

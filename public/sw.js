/* NovaFire Tech – service worker
 * - Static assets: cache-first
 * - /tech pages: network-first with cache fallback (offline job viewing)
 * - Never caches API, Supabase, or non-GET requests
 */

const VERSION = "nf-v1";
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = "/offline";

const PRECACHE_PAGES = ["/offline", "/tech", "/tech/jobs", "/tech/scan", "/tech/stock"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_PAGES))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    /\.(?:png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)
  );
}

function isTechPage(url) {
  return (
    url.pathname === "/tech" ||
    url.pathname.startsWith("/tech/") ||
    url.pathname === OFFLINE_URL
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase etc.
  if (url.pathname.startsWith("/api/")) return;

  // Static assets: cache-first
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(ASSET_CACHE).then((c) => c.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Tech pages (navigations + prefetches): network-first, cache fallback
  if (isTechPage(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(url.pathname, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(url.pathname);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return (
            offline ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        })
    );
  }
});

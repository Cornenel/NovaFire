/* NovaFire Tech – service worker
 * - Static assets: cache-first
 * - /tech pages: network-first with cache fallback (offline job viewing)
 * - Never caches API, Supabase, RSC payloads, or non-GET requests
 *
 * IMPORTANT: Next.js App Router uses separate requests for HTML documents
 * (navigate) and RSC flight data (client transitions). Caching RSC responses
 * and serving them as documents shows raw flight text on screen.
 */

const VERSION = "nf-v3";
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
  // Never cache-first marketing photography — a bad entry blanks the hero.
  if (url.pathname.startsWith("/quiet-ground/")) return false;
  if (url.pathname === "/og.png") return false;
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

/** Full-page load only — not client-side RSC transitions or prefetches. */
function isDocumentNavigation(request) {
  return request.mode === "navigate";
}

/** Next.js flight / prefetch requests must never be cached or served as HTML. */
function isRscOrDataRequest(request, url) {
  if (url.searchParams.has("_rsc")) return true;
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-Prefetch") === "1") return true;
  if (request.headers.get("Next-Action")) return true;
  const accept = request.headers.get("Accept") ?? "";
  if (accept.includes("text/x-component")) return true;
  return false;
}

function isHtmlDocumentResponse(response) {
  const type = response.headers.get("content-type") ?? "";
  return type.includes("text/html");
}

function pageCacheKey(pathname) {
  return `page:${pathname}`;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
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

  // Tech pages: only handle full document navigations
  if (isTechPage(url)) {
    if (!isDocumentNavigation(request) || isRscOrDataRequest(request, url)) {
      return;
    }

    const cacheKey = pageCacheKey(url.pathname);

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && isHtmlDocumentResponse(response)) {
            const clone = response.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(cacheKey, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(cacheKey);
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

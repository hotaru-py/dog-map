/* SNUC Dog Tracker service worker: installable app, works with a patchy campus connection. */
const VERSION = "v2";
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const MAX_RUNTIME_ENTRIES = 600;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(["/", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/maplibre/maplibre-gl-worker.mjs"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, RUNTIME].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim() {
  const cache = await caches.open(RUNTIME);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_RUNTIME_ENTRIES; i++) await cache.delete(keys[i]);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || (request.mode === "navigate" ? await caches.match("/") : undefined) || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) (await caches.open(cacheName)).put(request, res.clone()).then(trim);
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone()).then(trim);
      return res;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/maplibre/")) event.respondWith(cacheFirst(request, SHELL));
    else if (url.pathname === "/api/v2/dogs" || /^\/api\/v2\/dogs\/\d+$/.test(url.pathname)) event.respondWith(networkFirst(request, RUNTIME));
    return;
  }

  // Map style, tiles, fonts and sprites, plus dog photos from other hosts
  if (url.hostname.endsWith("openfreemap.org") || request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request));
  }
});

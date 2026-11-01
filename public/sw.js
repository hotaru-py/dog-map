/* Campus Dog Map service worker: makes the app installable and usable offline. */
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const MAX_RUNTIME_ENTRIES = 400;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(["/", "/manifest.webmanifest", "/icon.svg", "/icon-192.png"]))
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

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || (await caches.match("/")) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) (await caches.open(SHELL)).put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok || res.type === "opaque") {
        cache.put(request, res.clone()).then(() => trim(RUNTIME, MAX_RUNTIME_ENTRIES));
      }
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Page navigations: fresh when online, cached app shell when offline
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(cacheFirst(request));
    } else if (url.pathname === "/api/dogs" || url.pathname === "/api/likes") {
      event.respondWith(networkFirst(request, RUNTIME));
    }
    return;
  }

  // Map tiles and dog photos from other origins
  if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request));
  }
});

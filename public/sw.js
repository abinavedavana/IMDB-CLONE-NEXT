const CACHE_NAME = "movie-app-cache-v2";
const STATIC_ASSETS = ["/", "/watchlist"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "watchlist-sync") {
    event.waitUntil(drainQueueViaClient());
  }
});

async function drainQueueViaClient() {
  const clients = await self.clients.matchAll({ type: "window" });
  if (clients.length === 0) throw new Error("No active client");
  clients.forEach((client) => client.postMessage({ type: "SW_DRAIN_SYNC_QUEUE" }));
}
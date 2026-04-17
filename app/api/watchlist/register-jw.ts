import { drainSyncQueue, hydrateFromServer } from "@/lib/repository/watchlistRepo";

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      console.log("[SW] Registered", reg.scope);
    })
    .catch((err) => {
      console.warn("[SW] Registration failed", err);
    });

  // Listen for SW messages (e.g. drain queue after background sync)
  navigator.serviceWorker.addEventListener("message", async (event) => {
    if (event.data?.type === "SW_DRAIN_SYNC_QUEUE") {
      await drainSyncQueue();
    }
  });

  // On reconnect: drain queue + hydrate from server
  window.addEventListener("online", async () => {
    console.log("[Network] Back online — syncing…");
    await drainSyncQueue();
    await hydrateFromServer();

    // Trigger background sync via SW if supported
    const reg = await navigator.serviceWorker.ready;
    if ("sync" in reg) {
      await (reg as ServiceWorkerRegistration & {
        sync: { register(tag: string): Promise<void> };
      }).sync.register("watchlist-sync");
    }
  });
}
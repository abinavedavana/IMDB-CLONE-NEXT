import { drainSyncQueue, hydrateFromServer } from "./repository/watchlistRepo";

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

  navigator.serviceWorker.addEventListener("message", async (event) => {
    if (event.data?.type === "SW_DRAIN_SYNC_QUEUE") {
      await drainSyncQueue();
    }
  });

  window.addEventListener("online", async () => {
    console.log("[Network] Back online — syncing…");
    await drainSyncQueue();
    await hydrateFromServer();

    const reg = await navigator.serviceWorker.ready;
    if ("sync" in reg) {
      await (reg as any).sync.register("watchlist-sync");
    }
  });
}
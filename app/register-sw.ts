export function registerServiceWorker() {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("Service Worker Registered"))
      .catch((err) => console.error("SW failed", err));
  }
}
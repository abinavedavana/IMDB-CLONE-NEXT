import type { WatchlistItem } from "./schemas/watchlist";

export type WatchlistChannelMessage =
  | { type: "added"; item: WatchlistItem }
  | { type: "removed"; id: string }
  | { type: "synced" };

type MessageHandler = (msg: WatchlistChannelMessage) => void;

let channel: BroadcastChannel | null = null;

export function getWatchlistChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel("watchlist-sync");
  }
  return channel;
}

export function broadcastWatchlistUpdate(msg: WatchlistChannelMessage): void {
  const ch = getWatchlistChannel();
  ch?.postMessage(msg);
}

export function subscribeToWatchlistChannel(
  handler: MessageHandler
): () => void {
  const ch = getWatchlistChannel();
  if (!ch) return () => {};

  const listener = (event: MessageEvent) => {
    handler(event.data as WatchlistChannelMessage);
  };

  ch.addEventListener("message", listener);
  return () => ch.removeEventListener("message", listener);
}
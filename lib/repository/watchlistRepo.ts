"use client";


import { getDB } from "../db/indexeddb";
import {
  WatchlistItem,
  WatchlistItemSchema,
  SyncOperation,
  SyncOperationSchema,
  tickClock,
  mergeClock,
  resolveConflict,
} from "../schemas/watchlist";
import { getDeviceId } from "../device";
import { broadcastWatchlistUpdate } from "../watchlistChannel";

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const db = await getDB();
  return db.getAll("watchlist");
}

export async function isInWatchlist(id: string): Promise<boolean> {
  const db = await getDB();
  const item = await db.get("watchlist", id);
  return !!item;
}

export async function addToWatchlist(movie: {
  id: string;
  title: string;
  poster?: string;
  mediaType?: "movie" | "tv";
}): Promise<WatchlistItem> {
  const db = await getDB();
  const deviceId = getDeviceId();
  const now = Date.now();
  const existing = await db.get("watchlist", movie.id);

  const vector = existing
    ? tickClock(existing.vector, deviceId)
    : { [deviceId]: 1 };

  const item: WatchlistItem = WatchlistItemSchema.parse({
    id: movie.id,
    title: movie.title,
    poster: movie.poster,
    mediaType: movie.mediaType ?? "movie",
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
    deviceId,
    vector,
    syncStatus: "pending_add",
  });

  await db.put("watchlist", item);
  await enqueueSyncOp({ id: item.id, op: "add", item, timestamp: now, retries: 0 });
  broadcastWatchlistUpdate({ type: "added", item });
  drainSyncQueue().catch(() => {});

  return item;
}

export async function removeFromWatchlist(id: string): Promise<void> {
  const db = await getDB();
  const snapshot = await db.get("watchlist", id);
  if (!snapshot) return;

  // Optimistic delete
  await db.delete("watchlist", id);
  broadcastWatchlistUpdate({ type: "removed", id });

  // Try server directly — rollback if it fails
  try {
    const res = await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
  } catch (err) {
    // Rollback — restore item in IDB and notify other tabs
    await db.put("watchlist", snapshot);
    broadcastWatchlistUpdate({ type: "added", item: snapshot });
    throw err; // re-throw so WatchlistToggle catches it and flips back
  }
}

async function enqueueSyncOp(op: SyncOperation): Promise<void> {
  const db = await getDB();
  const parsed = SyncOperationSchema.parse(op);
  await db.put("syncQueue", parsed);
}

export async function drainSyncQueue(): Promise<void> {
  const db = await getDB();
  const ops = await db.getAllFromIndex("syncQueue", "by-timestamp");

  for (const op of ops) {
    try {
      if (op.op === "add" && op.item) {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(op.item),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);

        const serverItem: WatchlistItem = await res.json();
        const localItem = await db.get("watchlist", op.id);
        if (localItem && serverItem) {
          const resolved = resolveConflict(localItem, serverItem);
          const merged = {
            ...resolved,
            vector: mergeClock(localItem.vector, serverItem.vector),
            syncStatus: "synced" as const,
          };
          await db.put("watchlist", merged);
        }
      } else if (op.op === "remove") {
        const res = await fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: op.id }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
      }

      await db.delete("syncQueue", op.id);
    } catch (err) {
      const retries = (op.retries ?? 0) + 1;
      if (retries >= 5) {
        await db.delete("syncQueue", op.id);
      } else {
        await db.put("syncQueue", { ...op, retries });
      }
      console.warn(`Sync op ${op.id} failed (attempt ${retries})`, err);
    }
  }
}

export async function hydrateFromServer(): Promise<void> {
  try {
    const res = await fetch("/api/watchlist");
    if (!res.ok) return;

    const serverItems: WatchlistItem[] = await res.json();
    const db = await getDB();

    for (const serverItem of serverItems) {
      const local = await db.get("watchlist", serverItem.id);
      if (!local) {
        await db.put("watchlist", { ...serverItem, syncStatus: "synced" });
      } else {
        const resolved = resolveConflict(local, serverItem);
        const merged = {
          ...resolved,
          vector: mergeClock(local.vector, serverItem.vector),
          syncStatus: "synced" as const,
        };
        await db.put("watchlist", merged);
      }
    }
  } catch {
    // offline — use local data
  }
}
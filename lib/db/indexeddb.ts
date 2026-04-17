import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { WatchlistItem, SyncOperation } from "../schemas/watchlist";

interface WatchlistDB extends DBSchema {
  watchlist: {
    key: string;
    value: WatchlistItem;
  };
  syncQueue: {
    key: string;
    value: SyncOperation;
    indexes: { "by-timestamp": number };
  };
}

let _db: IDBPDatabase<WatchlistDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<WatchlistDB>> {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (_db) return _db;

  _db = await openDB<WatchlistDB>("movie-watchlist-db", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("watchlist")) {
        db.createObjectStore("watchlist", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        const store = db.createObjectStore("syncQueue", { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      }
    },
  });

  return _db;
}
import { z } from "zod";

export const VectorClockSchema = z.record(z.string(), z.number());

export const SyncStatusSchema = z.enum([
  "synced",
  "pending_add",
  "pending_remove",
  "conflict",
]);

export const WatchlistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  poster: z.string().optional(),
  mediaType: z.enum(["movie", "tv"]).default("movie"),
  addedAt: z.number(),
  updatedAt: z.number(),
  deviceId: z.string(),
  vector: VectorClockSchema,
  syncStatus: SyncStatusSchema.default("pending_add"),
});

export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;
export type VectorClock = z.infer<typeof VectorClockSchema>;
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

export const SyncOperationSchema = z.object({
  id: z.string(),
  op: z.enum(["add", "remove"]),
  item: WatchlistItemSchema.optional(),
  timestamp: z.number(),
  retries: z.number().default(0),
});

export type SyncOperation = z.infer<typeof SyncOperationSchema>;

export function tickClock(vector: VectorClock, deviceId: string): VectorClock {
  return { ...vector, [deviceId]: (vector[deviceId] ?? 0) + 1 };
}

export function mergeClock(a: VectorClock, b: VectorClock): VectorClock {
  const result: VectorClock = { ...a };
  for (const [device, clock] of Object.entries(b)) {
    result[device] = Math.max(result[device] ?? 0, clock);
  }
  return result;
}

export function resolveConflict(
  local: WatchlistItem,
  remote: WatchlistItem
): WatchlistItem {
  if (local.updatedAt !== remote.updatedAt) {
    return local.updatedAt > remote.updatedAt ? local : remote;
  }
  const localSum = Object.values(local.vector).reduce((a, b) => a + b, 0);
  const remoteSum = Object.values(remote.vector).reduce((a, b) => a + b, 0);
  return localSum >= remoteSum ? local : remote;
}
"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Draft } from "../schemas/review";

interface ReviewsDB extends DBSchema {
  drafts: {
    key: string; // movieId
    value: Draft;
  };
  pendingReviews: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
      retries: number;
    };
  };
}

let _db: IDBPDatabase<ReviewsDB> | null = null;

export async function getReviewsDB(): Promise<IDBPDatabase<ReviewsDB>> {
  if (typeof window === "undefined") throw new Error("IndexedDB only in browser");
  if (_db) return _db;

  _db = await openDB<ReviewsDB>("reviews-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("drafts")) {
        db.createObjectStore("drafts", { keyPath: "movieId" });
      }
      if (!db.objectStoreNames.contains("pendingReviews")) {
        db.createObjectStore("pendingReviews", { keyPath: "id" });
      }
    },
  });

  return _db;
}

export async function saveDraft(draft: Draft): Promise<void> {
  const db = await getReviewsDB();
  await db.put("drafts", draft);
}

export async function getDraft(movieId: string): Promise<Draft | undefined> {
  const db = await getReviewsDB();
  return db.get("drafts", movieId);
}

export async function deleteDraft(movieId: string): Promise<void> {
  const db = await getReviewsDB();
  await db.delete("drafts", movieId);
}

export async function savePendingReview(review: any): Promise<void> {
  const db = await getReviewsDB();
  await db.put("pendingReviews", {
    id: review.idempotencyKey,
    data: review,
    timestamp: Date.now(),
    retries: 0,
  });
}

export async function getPendingReviews(): Promise<any[]> {
  const db = await getReviewsDB();
  return db.getAll("pendingReviews");
}

export async function deletePendingReview(id: string): Promise<void> {
  const db = await getReviewsDB();
  await db.delete("pendingReviews", id);
}
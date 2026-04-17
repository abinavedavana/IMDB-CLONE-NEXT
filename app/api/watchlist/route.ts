import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import {
  WatchlistItemSchema,
  mergeClock,
  resolveConflict,
  type WatchlistItem,
} from "@/lib/schemas/watchlist";
import { ZodError } from "zod";

function getUserId(req: Request): string {
  return req.headers.get("x-device-id") ?? "anonymous";
}

function watchlistCol(userId: string) {
  return db.collection("users").doc(userId).collection("watchlist");
}

export async function GET(req: Request) {
  try {
    const userId = getUserId(req);
    const snapshot = await watchlistCol(userId).get();
    const items: WatchlistItem[] = snapshot.docs.map((doc) => doc.data() as WatchlistItem);
    return NextResponse.json(items, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("[GET /api/watchlist]", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getUserId(req);
    const body = await req.json();
    const incoming: WatchlistItem = WatchlistItemSchema.parse(body);
    const docRef = watchlistCol(userId).doc(String(incoming.id));
    const existing = await docRef.get();

    let resolved: WatchlistItem;
    if (existing.exists) {
      const serverItem = existing.data() as WatchlistItem;
      resolved = resolveConflict(incoming, serverItem);
      resolved = {
        ...resolved,
        vector: mergeClock(incoming.vector, serverItem.vector),
        syncStatus: "synced",
      };
    } else {
      resolved = { ...incoming, syncStatus: "synced" };
    }

    await docRef.set(resolved);
    return NextResponse.json(resolved, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 422 }
      );
    }
    console.error("[POST /api/watchlist]", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = getUserId(req);
    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await watchlistCol(userId).doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/watchlist]", error);
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }
}
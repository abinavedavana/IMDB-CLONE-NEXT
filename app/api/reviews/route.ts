import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { CreateReviewSchema } from "@/lib/schemas/review";
import { wilsonScore } from "@/lib/reviews/wilsonScore";
import { containsProfanity } from "@/lib/reviews/profanityFilter";
import { ZodError } from "zod";

// ─── Rate limiting 
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(deviceId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(deviceId);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(deviceId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (limit.count >= 5) return false;
  limit.count++;
  return true;
}

// ─── GET — fetch reviews for a movie
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const movieId = searchParams.get("movieId");
    const sort = searchParams.get("sort") ?? "helpful";

    if (!movieId) {
      return NextResponse.json({ error: "movieId required" }, { status: 400 });
    }

    const snapshot = await db
      .collection("reviews")
      .where("movieId", "==", movieId)
      .where("isDeleted", "==", false)
      .get();

    let reviews = snapshot.docs.map((doc) => doc.data());

    // Sort
    reviews = reviews.sort((a, b) => {
      if (sort === "helpful") return b.wilsonScore - a.wilsonScore;
      if (sort === "recent") return b.createdAt - a.createdAt;
      if (sort === "controversial") {
        return Math.min(b.upvotes, b.downvotes) - Math.min(a.upvotes, a.downvotes);
      }
      return 0;
    });

    return NextResponse.json(reviews, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[GET /api/reviews]", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

// ─── POST — create review
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = CreateReviewSchema.parse(body);

    // Rate limit
    if (!checkRateLimit(data.deviceId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429 }
      );
    }

    // Idempotency check
    const existing = await db
      .collection("reviews")
      .where("idempotencyKey", "==", data.idempotencyKey)
      .get();

    if (!existing.empty) {
      return NextResponse.json(existing.docs[0].data(), { status: 200 });
    }

    // Moderation
    if (containsProfanity(data.content)) {
      return NextResponse.json(
        { error: "Content violates community guidelines." },
        { status: 422 }
      );
    }

    const now = Date.now();
    const review = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      upvotes: 0,
      downvotes: 0,
      wilsonScore: 0,
      flagCount: 0,
      isFlagged: false,
      revisions: [],
    };

    await db.collection("reviews").doc(review.id).set(review);

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 422 }
      );
    }
    console.error("[POST /api/reviews]", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
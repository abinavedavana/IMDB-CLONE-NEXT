import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { UpdateReviewSchema } from "@/lib/schemas/review";
import { containsProfanity } from "@/lib/reviews/profanityFilter";
import { ZodError } from "zod";

type Props = { params: Promise<{ reviewId: string }> };

// ─── PUT — update review (with revision history) 
export async function PUT(req: Request, { params }: Props) {
  try {
    const { reviewId } = await params;
    const body = await req.json();
    const data = UpdateReviewSchema.parse(body);

    const docRef = db.collection("reviews").doc(reviewId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const review = doc.data()!;

    if (review.deviceId !== data.deviceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (data.content && containsProfanity(data.content)) {
      return NextResponse.json(
        { error: "Content violates community guidelines." },
        { status: 422 }
      );
    }

    // Save revision
    const revisions = [
      ...(review.revisions ?? []),
      {
        content: review.content,
        rating: review.rating,
        editedAt: Date.now(),
      },
    ];

    const updated = {
      ...review,
      content: data.content ?? review.content,
      rating: data.rating ?? review.rating,
      updatedAt: Date.now(),
      revisions,
    };

    await docRef.set(updated);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    }
    console.error("[PUT /api/reviews]", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

// ─── DELETE — soft delete
export async function DELETE(req: Request, { params }: Props) {
  try {
    const { reviewId } = await params;
    const { deviceId } = await req.json();

    const docRef = db.collection("reviews").doc(reviewId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const review = doc.data()!;

    if (review.deviceId !== deviceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await docRef.update({
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/reviews]", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
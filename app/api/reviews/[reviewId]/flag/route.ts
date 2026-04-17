import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

type Props = { params: Promise<{ reviewId: string }> };

export async function POST(req: Request, { params }: Props) {
  try {
    const { reviewId } = await params;
    const { deviceId } = await req.json();

    const docRef = db.collection("reviews").doc(reviewId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const review = doc.data()!;
    const newFlagCount = (review.flagCount ?? 0) + 1;
    const isFlagged = newFlagCount >= 3;

    await docRef.update({ flagCount: newFlagCount, isFlagged });

    return NextResponse.json({ flagCount: newFlagCount, isFlagged });
  } catch (error) {
    return NextResponse.json({ error: "Failed to flag" }, { status: 500 });
  }
}
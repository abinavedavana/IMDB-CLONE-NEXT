import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { wilsonScore } from "@/lib/reviews/wilsonScore";
import { VoteSchema } from "@/lib/schemas/review";

type Props = { params: Promise<{ reviewId: string }> };

export async function POST(req: Request, { params }: Props) {
  try {
    const { reviewId } = await params;
    const body = await req.json();
    const { deviceId, vote } = VoteSchema.parse({ ...body, reviewId });

    const docRef = db.collection("reviews").doc(reviewId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const review = doc.data()!;

    // Check if already voted
    const voteRef = db
      .collection("votes")
      .doc(`${reviewId}_${deviceId}`);
    const existingVote = await voteRef.get();

    let upvotes = review.upvotes ?? 0;
    let downvotes = review.downvotes ?? 0;

    if (existingVote.exists) {
      const prev = existingVote.data()!.vote;
      if (prev === vote) {
        // Undo vote
        if (vote === "up") upvotes--;
        else downvotes--;
        await voteRef.delete();
      } else {
        // Change vote
        if (vote === "up") { upvotes++; downvotes--; }
        else { downvotes++; upvotes--; }
        await voteRef.set({ deviceId, vote, reviewId });
      }
    } else {
      if (vote === "up") upvotes++;
      else downvotes++;
      await voteRef.set({ deviceId, vote, reviewId });
    }

    const newWilsonScore = wilsonScore(upvotes, downvotes);

    await docRef.update({ upvotes, downvotes, wilsonScore: newWilsonScore });

    return NextResponse.json({ upvotes, downvotes, wilsonScore: newWilsonScore });
  } catch (error) {
    console.error("[POST /api/reviews/vote]", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
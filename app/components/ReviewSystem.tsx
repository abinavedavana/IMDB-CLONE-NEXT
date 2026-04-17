"use client";

import { useState, useEffect, useOptimistic, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getDeviceId } from "@/lib/device";
import ReviewForm from "./ReviewForm";
import type { Review, SortOrder } from "@/lib/schemas/review";

interface Props {
  movieId: string;
  initialReviews: Review[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 font-bold">{rating}/10</span>
  );
}

function ReviewCard({
  review,
  onVote,
  onDelete,
  onFlag,
  deviceId,
}: {
  review: Review;
  onVote: (id: string, vote: "up" | "down") => void;
  onDelete: (id: string) => void;
  onFlag: (id: string) => void;
  deviceId: string;
}) {
  const [showRevisions, setShowRevisions] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  const isOwner = review.deviceId === deviceId;

  function handleDelete() {
    setDeleted(true);
    const timer = setTimeout(() => {
      onDelete(review.id);
    }, 5000);
    setUndoTimer(timer);
  }

  function handleUndo() {
    setDeleted(false);
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(null);
  }

  if (deleted) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.6 }}
        className="bg-slate-900 p-4 rounded-xl flex items-center justify-between"
        data-testid={`review-deleted-${review.id}`}
      >
        <span className="text-gray-400 text-sm">Review deleted</span>
        <button
          onClick={handleUndo}
          className="text-yellow-400 text-sm hover:underline"
          data-testid={`review-undo-${review.id}`}
        >
          Undo
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-900 p-5 rounded-xl space-y-3"
      data-testid={`review-card-${review.id}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold">{review.authorName}</p>
          <p className="text-xs text-gray-400">
            {new Date(review.createdAt).toLocaleDateString()}
            {review.revisions.length > 0 && " · edited"}
          </p>
        </div>
        <StarRating rating={review.rating} />
      </div>

      <p className="text-gray-300 text-sm leading-relaxed">{review.content}</p>

      {review.revisions.length > 0 && (
        <button
          onClick={() => setShowRevisions(!showRevisions)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          {showRevisions ? "Hide" : "Show"} edit history ({review.revisions.length})
        </button>
      )}

      <AnimatePresence>
        {showRevisions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-700 pt-3 space-y-2"
          >
            {review.revisions.map((rev, i) => (
              <div key={i} className="text-xs text-gray-500">
                <span>{new Date(rev.editedAt).toLocaleDateString()}: </span>
                <span>{rev.content.slice(0, 100)}...</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={() => onVote(review.id, "up")}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-green-400 transition"
          data-testid={`vote-up-${review.id}`}
        >
          👍 {review.upvotes}
        </button>
        <button
          onClick={() => onVote(review.id, "down")}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition"
          data-testid={`vote-down-${review.id}`}
        >
          👎 {review.downvotes}
        </button>
        <button
          onClick={() => onFlag(review.id)}
          className="text-xs text-gray-500 hover:text-orange-400 transition ml-auto"
          data-testid={`flag-${review.id}`}
        >
          🚩 Flag
        </button>
        {isOwner && (
          <button
            onClick={handleDelete}
            className="text-xs text-red-400 hover:text-red-300 transition"
            data-testid={`delete-${review.id}`}
          >
            Delete
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function ReviewSystem({ movieId, initialReviews }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [sortOrder, setSortOrder] = useState<SortOrder>("helpful");
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const res = await fetch(`/api/reviews?movieId=${movieId}&sort=${sortOrder}`);
        if (res.ok) setReviews(await res.json());
      } catch {}
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [movieId, sortOrder]);

  // Refetch on sort change
  useEffect(() => {
    fetch(`/api/reviews?movieId=${movieId}&sort=${sortOrder}`)
      .then((r) => r.json())
      .then(setReviews)
      .catch(() => {});
  }, [sortOrder, movieId]);

  const handleNewReview = useCallback((review: Review) => {
    setReviews((prev) => [review, ...prev]);
  }, []);

  const handleVote = useCallback(async (reviewId: string, vote: "up" | "down") => {
    // Optimistic update
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, upvotes: vote === "up" ? r.upvotes + 1 : r.upvotes,
                     downvotes: vote === "down" ? r.downvotes + 1 : r.downvotes }
          : r
      )
    );

    try {
      const res = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, vote }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReviews((prev) =>
          prev.map((r) => r.id === reviewId ? { ...r, ...updated } : r)
        );
      }
    } catch {}
  }, [deviceId]);

  const handleDelete = useCallback(async (reviewId: string) => {
    try {
      await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {}
  }, [deviceId]);

  const handleFlag = useCallback(async (reviewId: string) => {
    try {
      await fetch(`/api/reviews/${reviewId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
    } catch {}
  }, [deviceId]);

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOrder === "helpful") return b.wilsonScore - a.wilsonScore;
    if (sortOrder === "recent") return b.createdAt - a.createdAt;
    return Math.min(b.upvotes, b.downvotes) - Math.min(a.upvotes, a.downvotes);
  });

  return (
    <section data-testid="review-system" className="mt-12">
      <h2 className="text-2xl font-semibold mb-6">Reviews</h2>

      <ReviewForm movieId={movieId} onSubmitted={handleNewReview} />

      {/* Sort controls */}
      <div className="flex gap-3 mb-6" data-testid="sort-controls">
        {(["helpful", "recent", "controversial"] as SortOrder[]).map((order) => (
          <button
            key={order}
            onClick={() => setSortOrder(order)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition
              ${sortOrder === order
                ? "bg-yellow-400 text-black"
                : "bg-slate-800 text-gray-300 hover:bg-slate-700"}`}
            data-testid={`sort-${order}`}
          >
            {order.charAt(0).toUpperCase() + order.slice(1)}
          </button>
        ))}
      </div>

      {sortedReviews.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          No reviews yet. Be the first to review!
        </p>
      ) : (
        <motion.div layout className="space-y-4">
          <AnimatePresence mode="popLayout">
            {sortedReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onVote={handleVote}
                onDelete={handleDelete}
                onFlag={handleFlag}
                deviceId={deviceId}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
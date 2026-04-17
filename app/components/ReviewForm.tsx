"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getDeviceId } from "@/lib/device";
import { saveDraft, getDraft, deleteDraft } from "@/lib/db/reviewsDB";

interface Props {
  movieId: string;
  onSubmitted: (review: any) => void;
}

export default function ReviewForm({ movieId, onSubmitted }: Props) {
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(7);
  const [authorName, setAuthorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load draft on mount
  useEffect(() => {
    getDraft(movieId).then((draft) => {
      if (draft) {
        setContent(draft.content);
        setRating(draft.rating);
        setAuthorName(draft.authorName);
        setDraftSaved(true);
      }
    }).catch(() => {});
  }, [movieId]);

  // Autosave draft
  useEffect(() => {
    if (!content && !authorName) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      try {
        await saveDraft({
          movieId,
          content,
          rating,
          authorName,
          savedAt: Date.now(),
        });
        setDraftSaved(true);
      } catch {}
    }, 1000);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [content, rating, authorName, movieId]);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || !authorName.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (content.length < 10) {
      setError("Review must be at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const idempotencyKey = `${getDeviceId()}-${movieId}-${Date.now()}`;

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId,
          deviceId: getDeviceId(),
          authorName: authorName.trim(),
          content: content.trim(),
          rating,
          idempotencyKey,
        }),
      });

      if (res.status === 429) {
        setError("Too many reviews. Please wait a minute.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to submit review.");
        return;
      }

      const review = await res.json();
      await deleteDraft(movieId);
      setContent("");
      setAuthorName("");
      setRating(7);
      setDraftSaved(false);
      setShowForm(false);
      onSubmitted(review);
    } catch {
      setError("Network error. Your draft has been saved.");
    } finally {
      setIsSubmitting(false);
    }
  }, [content, authorName, rating, movieId, onSubmitted]);

  return (
    <div className="mb-8">
      {!showForm ? (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm(true)}
          className="bg-yellow-400 text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-500"
        >
          Write a Review
        </motion.button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 p-6 rounded-xl space-y-4"
            data-testid="review-form"
          >
            <h3 className="text-lg font-semibold">Write a Review</h3>

            {draftSaved && (
              <p className="text-xs text-green-400">✓ Draft saved</p>
            )}

            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              className="w-full bg-slate-800 text-white px-4 py-2 rounded-lg outline-none"
              data-testid="review-author"
            />

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Rating:</span>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`w-8 h-8 rounded text-sm font-bold transition
                    ${rating === n ? "bg-yellow-400 text-black" : "bg-slate-700 text-gray-300 hover:bg-slate-600"}`}
                  data-testid={`rating-${n}`}
                >
                  {n}
                </button>
              ))}
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts... (min 10 characters)"
              rows={4}
              maxLength={2000}
              className="w-full bg-slate-800 text-white px-4 py-2 rounded-lg outline-none resize-none"
              data-testid="review-content"
            />

            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{content.length}/2000</span>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm"
                data-testid="review-error"
              >
                {error}
              </motion.p>
            )}

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-yellow-400 text-black px-6 py-2 rounded-lg font-semibold
                           hover:bg-yellow-500 disabled:opacity-50"
                data-testid="review-submit"
              >
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </motion.button>
              <button
                onClick={() => setShowForm(false)}
                className="bg-slate-700 text-white px-6 py-2 rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
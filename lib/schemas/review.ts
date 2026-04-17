import { z } from "zod";

export const ReviewSchema = z.object({
  id: z.string(),
  movieId: z.string(),
  deviceId: z.string(),
  authorName: z.string().min(1).max(50),
  content: z.string().min(10).max(2000),
  rating: z.number().min(1).max(10),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
  isDeleted: z.boolean().default(false),
  upvotes: z.number().default(0),
  downvotes: z.number().default(0),
  wilsonScore: z.number().default(0),
  flagCount: z.number().default(0),
  isFlagged: z.boolean().default(false),
  idempotencyKey: z.string(),
  revisions: z.array(z.object({
    content: z.string(),
    rating: z.number(),
    editedAt: z.number(),
  })).default([]),
});

export type Review = z.infer<typeof ReviewSchema>;

export const CreateReviewSchema = z.object({
  movieId: z.string(),
  deviceId: z.string(),
  authorName: z.string().min(1).max(50),
  content: z.string().min(10).max(2000),
  rating: z.number().min(1).max(10),
  idempotencyKey: z.string(),
});

export type CreateReview = z.infer<typeof CreateReviewSchema>;

export const UpdateReviewSchema = z.object({
  content: z.string().min(10).max(2000).optional(),
  rating: z.number().min(1).max(10).optional(),
  deviceId: z.string(),
});

export type UpdateReview = z.infer<typeof UpdateReviewSchema>;

export const DraftSchema = z.object({
  movieId: z.string(),
  content: z.string(),
  rating: z.number().min(1).max(10),
  authorName: z.string(),
  savedAt: z.number(),
});

export type Draft = z.infer<typeof DraftSchema>;

export const VoteSchema = z.object({
  reviewId: z.string(),
  deviceId: z.string(),
  vote: z.enum(["up", "down"]),
});

export type Vote = z.infer<typeof VoteSchema>;

export type SortOrder = "helpful" | "recent" | "controversial";
// Wilson score lower bound for ranking reviews
// https://www.evanmiller.org/how-not-to-sort-by-average-rating.html
export function wilsonScore(upvotes: number, downvotes: number): number {
  const n = upvotes + downvotes;
  if (n === 0) return 0;

  const z = 1.96; // 95% confidence
  const phat = upvotes / n;

  const score =
    (phat +
      (z * z) / (2 * n) -
      z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n);

  return Math.round(score * 10000) / 10000;
}

export function sortReviews(
  reviews: any[],
  order: "helpful" | "recent" | "controversial"
): any[] {
  return [...reviews].sort((a, b) => {
    if (order === "helpful") return b.wilsonScore - a.wilsonScore;
    if (order === "recent") return b.createdAt - a.createdAt;
    if (order === "controversial") {
      const aControversy = Math.min(a.upvotes, a.downvotes);
      const bControversy = Math.min(b.upvotes, b.downvotes);
      return bControversy - aControversy;
    }
    return 0;
  });
}
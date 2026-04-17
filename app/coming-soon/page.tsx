import { Suspense } from "react";
import { TimerIcon } from "lucide-react";
import { tmdb } from "@/lib/tmdbClient";
import MovieGrid from "../components/MovieGrid";
import { MovieGridSkeleton } from "../components/ErrorBoundary";
import PaginatedMovieList from "../components/PaginatedMovieList";

export const revalidate = 1800;

export default async function ComingSoonPage() {
  const [upcomingData, trendingData] = await Promise.all([
    tmdb.upcoming(1).catch(() => ({ results: [], page: 1, total_pages: 1, total_results: 0 })),
    tmdb.trending(1).catch(() => ({ results: [], page: 1, total_pages: 1, total_results: 0 })),
  ]);

  const today = new Date();
  const trendingIds = new Set(trendingData.results.map((m: any) => m.id));
  
  const filtered = upcomingData.results.filter((m: any) => {
    const isUnreleased = m.release_date && new Date(m.release_date) > today;
    const notTrending = !trendingIds.has(m.id);
    return isUnreleased && notTrending;
  });

  return (
    <div className="pt-24 px-6 text-white">
      <h1 className="text-3xl font-bold mb-8 flex gap-2 items-center">
        <TimerIcon className="w-10 h-10 text-yellow-400" />
        Coming Soon Movies
      </h1>

      <MovieGrid movies={filtered} comingSoon={true} />

      <Suspense fallback={<MovieGridSkeleton />}>
        <PaginatedMovieList
          endpoint={`/discover/movie?primary_release_date.gte=${new Date().toISOString().split("T")[0]}&sort_by=popularity.desc`}
          queryKey="upcoming"
          initialPage={2}
          totalPages={upcomingData.total_pages}
        />
      </Suspense>
    </div>
  );
}
import { Suspense } from "react";
import { ArrowUpCircleIcon } from "lucide-react";
import { tmdb } from "@/lib/tmdbClient";
import MovieGrid from "../components/MovieGrid";
import { MovieGridSkeleton } from "../components/ErrorBoundary";
import PaginatedMovieList from "../components/PaginatedMovieList";

export default async function TopRatedPage() {
  const data = await tmdb.topRated(1).catch(() => ({ results: [], page: 1, total_pages: 1 }));

  return (
    <div className="pt-24 px-6 text-white">
      <h1 className="text-3xl font-bold mb-8 flex gap-2">
        <ArrowUpCircleIcon className="w-10 h-10 text-yellow-400" />
        Top Rated Movies
      </h1>

      <MovieGrid movies={data.results} />

      <Suspense fallback={<MovieGridSkeleton />}>
        <PaginatedMovieList
          endpoint="/movie/top_rated"
          queryKey="top-rated"
          initialPage={2}
          totalPages={data.total_pages}
        />
      </Suspense>
    </div>
  );
}
import { Suspense } from "react";
import { Film } from "lucide-react";
import { tmdb } from "@/lib/tmdbClient";
import MovieGrid from "../components/MovieGrid";
import { MovieGridSkeleton } from "../components/ErrorBoundary";
import PaginatedMovieList from "../components/PaginatedMovieList";

// SSR — instant first page
export default async function TrendingPage() {
  const data = await tmdb.trending(1).catch(() => ({ results: [], page: 1, total_pages: 1 }));

  return (
    <div className="pt-24 px-6 text-white">
      <h1 className="text-3xl font-bold mb-8 flex gap-2 items-center">
        <Film className="w-10 h-10 text-yellow-400" />
        Trending Movies
      </h1>

      {/* SSR first page — instant */}
      <MovieGrid movies={data.results} />

      {/* Client pagination — streams in */}
      <Suspense fallback={<MovieGridSkeleton />}>
        <PaginatedMovieList
          endpoint="/trending/movie/week"
          queryKey="trending"
          initialPage={2}
          totalPages={data.total_pages}
        />
      </Suspense>
    </div>
  );
}
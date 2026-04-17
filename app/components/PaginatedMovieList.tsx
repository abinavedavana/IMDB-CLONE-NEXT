"use client";

import { useInfiniteMovies, usePrefetchMovie } from "@/lib/movieQueries";
import MovieCard from "./MovieCard";
import { MovieGridSkeleton } from "./ErrorBoundary";
import { motion } from "framer-motion";

interface Props {
  endpoint: string;
  queryKey: string;
  initialPage?: number;
  totalPages?: number;
}

export default function PaginatedMovieList({
  endpoint,
  queryKey,
}: Props) {
  const prefetchMovie = usePrefetchMovie();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteMovies(endpoint, queryKey);

  if (status === "pending") return <MovieGridSkeleton />;
  if (status === "error") return null;

  const movies = data?.pages?.flatMap((page: any) => page.results) ?? [];
  if (!movies.length) return null;

  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {movies.map((movie: any) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onMouseEnter={() => prefetchMovie(String(movie.id))}
          >
            <MovieCard movie={movie} />
          </motion.div>
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center mt-10">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold
                       hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingNextPage ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
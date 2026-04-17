"use client";

import Link from "next/link";
import WatchlistToggle from "./WatchlistToggle";

type Movie = {
  id: number;
  title: string;
  poster_path: string;
  rating?: number;
  vote_average?: number;
  year?: number;
  release_date?: string;
  genres?: string[];
  comingSoon?: boolean;
  duration?: string;
};

export default function MovieCard({ movie, comingSoon = false }: { movie: Movie; comingSoon?: boolean }) {
  if (!movie) return null;

  const rating = movie.vote_average ?? movie.rating;
  const year = movie.release_date?.split("-")[0] ?? movie.year;
  const isComingSoon = comingSoon || movie.comingSoon;

  const releaseLabel = movie.release_date
    ? `Releasing ${new Date(movie.release_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
    : "Release date TBA";

  return (
    <div className="min-w-[230] h-auto bg-slate-900 rounded-xl overflow-hidden flex flex-col hover:scale-105 transition">
      <Link href={`/movie/${movie.id}`}>
        {/* Poster */}
        <div className="h-[260] w-full bg-black relative">
          <img
            src={
              movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : "/placeholder-poster.png"
            }
            alt={movie.title}
            className="h-full w-full object-cover"
          />
          {isComingSoon && (
            <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
              Coming Soon
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-lg line-clamp-1">{movie.title}</h3>

          {isComingSoon ? (
            <p className="text-yellow-400 font-semibold text-sm mt-1">
              🗓️ {releaseLabel}
            </p>
          ) : (
            <div className="mt-1">
              <p className="text-sm text-gray-400">{year}</p>
              <div className="flex justify-between text-sm text-gray-300 mt-1">
                {rating && Number(rating) > 0 ? (
                  <span>⭐ {Number(rating).toFixed(1)}</span>
                ) : (
                  <span className="text-gray-500">No rating yet</span>
                )}
                {movie.duration && <span>{movie.duration}</span>}
              </div>
            </div>
          )}

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {movie.genres.map((genre: string) => (
                <span
                  key={genre}
                  className="text-xs bg-slate-800 px-2 py-1 rounded-full"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Bottom button */}
      {isComingSoon ? (
        <div className="px-4 pb-4 mt-auto">
          <div className="w-full text-center bg-slate-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-semibold cursor-default select-none">
            🎬 Coming Soon
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4 mt-auto" onClick={(e) => e.stopPropagation()}>
          <WatchlistToggle
            id={String(movie.id)}
            title={movie.title}
            poster={movie.poster_path}
            mediaType="movie"
          />
        </div>
      )}
    </div>
  );
}
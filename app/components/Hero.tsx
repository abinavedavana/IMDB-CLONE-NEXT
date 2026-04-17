"use client";

import Link from "next/link";
import WatchlistToggle from "./WatchlistToggle";

const IMAGE_BASE = "https://image.tmdb.org/t/p/original";

type HeroProps = {
  movie: any;
};

export default function Hero({ movie }: HeroProps) {
  if (!movie) return null;

  return (
    <section
      className="relative h-[75vh] w-full bg-cover bg-center"
      style={{
        backgroundImage: movie.backdrop_path
          ? `url(${IMAGE_BASE}${movie.backdrop_path})`
          : "black",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-r from-black via-black/70 to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center px-10 max-w-3xl text-white">
        <div>
          <h1 className="text-5xl font-bold mb-4">{movie.title}</h1>

          {/* Meta Info */}
          <div className="flex gap-4 text-sm text-gray-300 mb-3">
            <span>⭐ {movie.vote_average?.toFixed(1)}</span>
            <span>{movie.runtime ? `${movie.runtime} min` : ""}</span>
            <span>{movie.release_date?.slice(0, 4)}</span>
          </div>

          <p className="text-gray-300 text-lg line-clamp-3">
            {movie.overview}
          </p>

          {/* Buttons */}
          <div className="mt-6 flex gap-4 items-center">
            <Link href={`/movie/${movie.id}`}>
              <button className="bg-yellow-400 text-black px-6 py-3 rounded-md font-semibold hover:bg-yellow-500">
                ▶ Watch Now
              </button>
            </Link>

            {/* Connected WatchlistToggle */}
            <WatchlistToggle
              id={String(movie.id)}
              title={movie.title}
              poster={movie.poster_path}
              mediaType="movie"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
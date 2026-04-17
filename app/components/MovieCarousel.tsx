"use client";

import { useRef, useState, useEffect } from "react";
import MovieCard from "./MovieCard";
import Link from "next/link";

export default function MovieCarousel({
  title,
  movies,
  viewAllLink,
  comingSoon = false,
}: {
  title: string;
  movies: any[];
  viewAllLink: string;
  comingSoon?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({
      left: dir === "left" ? -350 : 350,
      behavior: "smooth",
    });
  };

  // Show skeleton while mounting to avoid hydration mismatch
  if (!mounted) {
    return (
      <section className="px-6 mt-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <div className="flex gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="min-w-[230] h-[380] bg-slate-800 rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  if (!movies || movies.length === 0) return (
    <section className="px-6 mt-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="flex gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="min-w-[230] h-[380] bg-slate-800 rounded-xl animate-pulse flex-shrink-0" />
        ))}
      </div>
    </section>
  );

  return (
    <section className="px-6 mt-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link
          href={viewAllLink}
          className="text-yellow-400 text-sm hover:underline"
        >
          View All
        </Link>
      </div>

      {/* Carousel */}
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 p-3 rounded-full"
        >
          ◀
        </button>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 p-3 rounded-full"
        >
          ▶
        </button>

        <div
          ref={rowRef}
          className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-hide pb-4"
        >
          {movies.map((movie) => (
            <MovieCard
              key={`${movie.id}-${movie.title}`}
              movie={movie}
              comingSoon={comingSoon}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
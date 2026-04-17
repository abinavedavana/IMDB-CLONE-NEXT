"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MovieError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MoviePage] Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
      <span className="text-6xl">🎬</span>
      <h1 className="text-2xl font-bold">Could not load movie</h1>
      <p className="text-gray-400 text-sm">
        The movie details are temporarily unavailable.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="bg-yellow-400 text-black px-6 py-2 rounded-md font-semibold hover:bg-yellow-500"
        >
          Try again
        </button>
        <Link
          href="/"
          className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
import { db } from "@/lib/firebase-admin";
import Image from "next/image";
import Link from "next/link";
import WatchlistToggle from "@/app/components/WatchlistToggle";
import { WatchlistItem } from "@/lib/schemas/watchlist";

async function getWatchlist(): Promise<WatchlistItem[]> {
  try {
    const snapshot = await db
      .collection("users")
      .doc("anonymous")
      .collection("watchlist")
      .orderBy("addedAt", "desc")
      .get();
    return snapshot.docs.map((doc) => doc.data() as WatchlistItem);
  } catch (err) {
    console.error("[WatchlistPage] Firestore fetch failed", err);
    return [];
  }
}

export const revalidate = 30;

export default async function WatchlistPage() {
  const movies = await getWatchlist();

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 md:p-10">
      <h1 className="text-3xl font-bold mb-2">My Watchlist</h1>
      <p className="text-gray-400 mb-8 text-sm">
        {movies.length} {movies.length === 1 ? "title" : "titles"} saved
      </p>

      {movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <span className="text-5xl mb-4">🎬</span>
          <p className="text-lg">Your watchlist is empty.</p>
          <p className="text-sm mt-1">
            Browse movies and hit "+ Watchlist" to save them.
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5"
          data-testid="watchlist-grid"
        >
          {movies.map((movie) => (
            <article
              key={movie.id}
              className="bg-gray-800 rounded-xl overflow-hidden flex flex-col"
              data-testid={`watchlist-item-${movie.id}`}
            >
              {/* Clickable poster */}
              <Link href={`/movie/${movie.id}`}>
                <div className="relative aspect-[2/3] w-full bg-gray-700 hover:opacity-80 transition cursor-pointer">
                  {movie.poster ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${movie.poster}`}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 20vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                      No image
                    </div>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="p-3 flex flex-col gap-2 flex-1">
                <Link href={`/movie/${movie.id}`}>
                  <h2 className="text-sm font-semibold leading-tight line-clamp-2 hover:text-yellow-400 transition cursor-pointer">
                    {movie.title}
                  </h2>
                </Link>
                <p className="text-xs text-gray-400 capitalize">
                  {movie.mediaType}
                </p>
                <div className="mt-auto pt-2">
                  <WatchlistToggle
                    id={movie.id}
                    title={movie.title}
                    poster={movie.poster}
                    mediaType={movie.mediaType}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
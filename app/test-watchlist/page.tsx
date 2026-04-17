import WatchlistToggle from "@/app/components/WatchlistToggle";

export default function TestWatchlistPage() {
  return (
    <main className="p-10 bg-black min-h-screen text-white">
      <h1 className="text-2xl mb-6">Test Watchlist Page</h1>
      <WatchlistToggle
        id="test-movie-001"
        title="Playwright Test Movie"
        poster="/test-poster.jpg"
        mediaType="movie"
      />
    </main>
  );
}
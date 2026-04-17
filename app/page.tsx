import Hero from "./components/Hero";
import MovieCarousel from "./components/MovieCarousel";
import { tmdb } from "@/lib/tmdbClient";

export const revalidate = 1800;

export default async function Home() {
  const [trendingData, topRatedData, upcomingData] = await Promise.all([
    tmdb.trending(1).catch(() => ({ results: [] })),
    tmdb.topRated(1).catch(() => ({ results: [] })),
    tmdb.upcoming(1).catch(() => ({ results: [] })),
  ]);

    // TEMP DEBUG
  console.log("UPCOMING COUNT:", upcomingData.results.length);
  console.log("UPCOMING SAMPLE:", upcomingData.results.slice(0, 3).map((m: any) => ({ title: m.title, date: m.release_date })));

  const trendingIds = new Set(trendingData.results.map((m: any) => m.id));
  const filteredUpcoming = upcomingData.results.filter(
    (m: any) =>
      !trendingIds.has(m.id) &&
      m.release_date &&
      new Date(m.release_date) > new Date()
  );

  // TEMP DEBUG
  console.log("FILTERED COUNT:", filteredUpcoming.length);


  return (
    <main className="bg-black min-h-screen text-white">
      <Hero movie={trendingData.results[0]} />

      <MovieCarousel
        title="Trending Now"
        movies={trendingData.results}
        viewAllLink="/trending"
      />

      <MovieCarousel
        title="Top Rated"
        movies={topRatedData.results}
        viewAllLink="/top-rated"
      />

      <MovieCarousel
        title="Coming Soon"
        movies={filteredUpcoming}
        viewAllLink="/coming-soon"
        comingSoon={true}
      />
    </main>
  );
}
import MovieCard from "./MovieCard";

type Movie = {
  id: number;
  title: string;
  poster_path: string;
  rating?: number;
  year?: number;
  duration?: string;
  genres?: string[];
  comingSoon?: boolean;
  vote_average?: number;
  release_date?: string;
};

export default function MovieGrid({ movies, comingSoon = false }: { movies: Movie[]; comingSoon?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} comingSoon={comingSoon} />
      ))}
    </div>
  );
}
"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

interface SearchMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
}

export default function Navbar() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced TMDB search
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(search)}&page=1`
        );
        const data = await res.json();
        setResults(data.results?.slice(0, 6) ?? []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  function handleSelect(id: number) {
    setSearch("");
    setResults([]);
    setShowDropdown(false);
    router.push(`/movie/${id}`);
  }

  function clearSearch() {
    setSearch("");
    setResults([]);
    setShowDropdown(false);
  }

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/70 backdrop-blur-md px-8 py-4 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-2 text-yellow-400 font-bold text-xl">
        🎬 MovieDB
      </div>

      {/* Search */}
      <div className="relative w-96" ref={wrapperRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search movies..."
          className="w-full bg-gray-900 text-white pl-10 pr-10 py-2 rounded-full outline-none"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {showDropdown && (
          <div className="absolute mt-2 w-full bg-gray-900 rounded-xl max-h-80 overflow-y-auto shadow-lg z-50">
            {loading ? (
              <p className="p-4 text-gray-400 text-sm">Searching...</p>
            ) : results.length > 0 ? (
              results.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => handleSelect(movie.id)}
                  className="flex items-center gap-4 p-3 hover:bg-gray-800 cursor-pointer"
                >
                  {movie.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                      alt={movie.title}
                      width={40}
                      height={60}
                      className="rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-15 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
                      N/A
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">{movie.title}</p>
                    <p className="text-sm text-gray-400">
                      {movie.release_date?.split("-")[0] ?? "Unknown"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-4 text-gray-400">No movies found</p>
            )}
          </div>
        )}
      </div>

      {/* Nav links + Theme toggle */}
      <div className="flex gap-6 text-gray-300 items-center">
        <Link href="/" className="hover:text-yellow-400">Movies</Link>
        <Link href="/top-rated" className="hover:text-yellow-400">Top Rated</Link>
        <Link href="/coming-soon" className="hover:text-yellow-400">Coming Soon</Link>
        <Link href="/watchlist" className=" hover:text-yellow-400">Watchlist</Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
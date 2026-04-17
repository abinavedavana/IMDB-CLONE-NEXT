"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import MovieCard from "./MovieCard";

type Movie = {
  id: number;
  title: string;
  poster_path: string;
  release_date?: string;
  character?: string;
};

export default function FilmographyExplorer({ movies }: { movies: Movie[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [year, setYear] = useState("all");
  const [role, setRole] = useState("all");
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    function updateColumns() {
      if (window.innerWidth < 640) setColumns(1);
      else if (window.innerWidth < 768) setColumns(2);
      else if (window.innerWidth < 1024) setColumns(3);
      else setColumns(4);
    }
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const years = useMemo(() => {
    const uniqueYears = new Set(
      movies.map((m) => m.release_date?.split("-")[0]).filter(Boolean)
    );
    return Array.from(uniqueYears).sort((a, b) => Number(b) - Number(a));
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const movieYear = movie.release_date?.split("-")[0];
      const yearMatch = year === "all" || movieYear === year;
      const roleMatch =
        role === "all" ||
        (movie.character &&
          movie.character.toLowerCase().includes(role.toLowerCase()));
      return yearMatch && roleMatch;
    });
  }, [movies, year, role]);

  const rows = useMemo(() => {
    const rowData = [];
    for (let i = 0; i < filteredMovies.length; i += columns) {
      rowData.push(filteredMovies.slice(i, i + columns));
    }
    return rowData;
  }, [filteredMovies, columns]);

  // ── Key fix: use measureElement for dynamic heights ──────────────────────
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 520,  // increased estimate
    overscan: 3,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="bg-gray-800 px-4 py-2 rounded text-white"
        >
          <option value="all">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Filter by role..."
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="bg-gray-800 px-4 py-2 rounded text-white"
        />
      </div>

      {/* Virtualized Grid — fixed height container with scroll */}
      <div
        ref={parentRef}
        className="w-full overflow-auto"
        style={{ height: "600px" }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
            width: "100%",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: "24px", // gap between rows
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    gap: "16px",
                  }}
                >
                  {row.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
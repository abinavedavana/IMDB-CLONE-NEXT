"use client";

import { useState } from "react";

type Props = {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
};

export default function AddToWatchlist({
  id,
  title,
  poster_path,
  vote_average,
}: Props) {

    const [added , setAdded] = useState(false)  ;

    const handleAdd = async () => {
    const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, poster_path, vote_average }),
    });

    if (res.ok) {
        setAdded(true);
    }
    };

  return (
    <button
      onClick={handleAdd}
      className="bg-gray-800/80 px-6 py-3 rounded-md hover:bg-gray-700 cursor-pointer"
    >
      {added ? "✓ Added" : "+ Add to Watchlist"}
    </button>
  );
}
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function clientFetch(endpoint: string, params: Record<string, any> = {}) {
  const searchParams = new URLSearchParams({
    api_key: process.env.NEXT_PUBLIC_TMDB_API_KEY ?? "",
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  });

  const res = await fetch(`${TMDB_BASE}${endpoint}?${searchParams}`);

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("retry-after") ?? "5") * 1000;
    await new Promise((r) => setTimeout(r, retryAfter));
    return clientFetch(endpoint, params);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const movieKeys = {
  all: ["movies"] as const,
  trending: (page: number) => ["movies", "trending", page] as const,
  topRated: (page: number) => ["movies", "top-rated", page] as const,
  upcoming: (page: number) => ["movies", "upcoming", page] as const,
  popular: (page: number) => ["movies", "popular", page] as const,
  detail: (id: string) => ["movies", "detail", id] as const,
  search: (query: string, page: number) => ["movies", "search", query, page] as const,
};

export function useTrending(page = 1) {
  return useQuery({
    queryKey: movieKeys.trending(page),
    queryFn: () => clientFetch("/trending/movie/week", { page }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopRated(page = 1) {
  return useQuery({
    queryKey: movieKeys.topRated(page),
    queryFn: () => clientFetch("/movie/top_rated", { page }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpcoming(page = 1) {
  return useQuery({
    queryKey: movieKeys.upcoming(page),
    queryFn: () => clientFetch("/movie/upcoming", { page }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInfiniteMovies(endpoint: string, key: string) {
  return useInfiniteQuery({
    queryKey: ["movies", "infinite", key],
    queryFn: ({ pageParam = 1 }) => clientFetch(endpoint, { page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePrefetchMovie() {
  const queryClient = useQueryClient();
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: movieKeys.detail(id),
      queryFn: () => clientFetch(`/movie/${id}`),
      staleTime: 10 * 60 * 1000,
    });
  };
}
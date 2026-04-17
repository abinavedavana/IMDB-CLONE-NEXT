// ─── Token bucket rate limiter
const BUCKET_CAPACITY = 40;
const REFILL_RATE = 10; // tokens per second

let tokens = BUCKET_CAPACITY;
let lastRefill = Date.now();

function consumeToken(): boolean {
  const now = Date.now();
  const elapsed = (now - lastRefill) / 1000;
  tokens = Math.min(BUCKET_CAPACITY, tokens + elapsed * REFILL_RATE);
  lastRefill = now;
  if (tokens >= 1) { tokens--; return true; }
  return false;
}

// ─── Circuit breaker 
type CircuitState = "closed" | "open" | "half-open";
let circuitState: CircuitState = "closed";
let failureCount = 0;
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT = 30_000;

function checkCircuit(): boolean {
  if (circuitState === "open") {
    if (Date.now() - lastFailureTime > RESET_TIMEOUT) {
      circuitState = "half-open";
      return true;
    }
    return false;
  }
  return true;
}

function onSuccess() {
  failureCount = 0;
  circuitState = "closed";
}

function onFailure() {
  failureCount++;
  lastFailureTime = Date.now();
  if (failureCount >= FAILURE_THRESHOLD) {
    circuitState = "open";
    console.warn("[TMDB] Circuit breaker OPEN");
  }
}

// ─── Exponential backoff + jitter 
async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffDelay(attempt: number): number {
  const base = Math.min(1000 * Math.pow(2, attempt), 30_000);
  const jitter = Math.random() * 500;
  return base + jitter;
}

// ─── Main fetch client 
const TMDB_BASE = "https://api.themoviedb.org/3";
const MAX_RETRIES = 3;

export interface FetchOptions {
  revalidate?: number;
  tags?: string[];
}

export async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  options: FetchOptions = {}
): Promise<T> {
  if (!checkCircuit()) {
    throw new Error("[TMDB] Circuit breaker is OPEN — request blocked");
  }

  // Rate limit check
  if (!consumeToken()) {
    await sleep(1000);
  }

  const searchParams = new URLSearchParams({
    api_key: process.env.TMDB_API_KEY ?? "",
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  });

  const url = `${TMDB_BASE}${endpoint}?${searchParams}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        next: {
          revalidate: options.revalidate ?? 300,
          tags: options.tags ?? [],
        },
      });

      // 429 — rate limited by server
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") ?? "5");
        await sleep(retryAfter * 1000);
        continue;
      }

      // 5xx — server error, retry
      if (res.status >= 500 && attempt < MAX_RETRIES) {
        onFailure();
        await sleep(backoffDelay(attempt));
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      onSuccess();
      return res.json() as Promise<T>;
    } catch (err) {
      onFailure();
      if (attempt === MAX_RETRIES) throw err;
      await sleep(backoffDelay(attempt));
    }
  }

  throw new Error(`[TMDB] Max retries exceeded for ${endpoint}`);
}

// ─── Typed endpoint helpers 
export interface MovieListResponse {
  results: any[];
  page: number;
  total_pages: number;
  total_results: number;
}

export const tmdb = {
  trending: (page = 1) =>
    tmdbFetch<MovieListResponse>("/trending/movie/week", { page }, {
      revalidate: 3600,
      tags: ["trending"],
    }),

  topRated: (page = 1) =>
    tmdbFetch<MovieListResponse>("/movie/top_rated", { page }, {
      revalidate: 3600,
      tags: ["top-rated"],
    }),

  upcoming: async (page = 1): Promise<MovieListResponse> => {
    const today = new Date().toISOString().split("T")[0];
    const apiKey = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY ?? "";
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&primary_release_date.gte=${today}&sort_by=popularity.desc&page=${page}&with_release_type=2|3`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          next: { revalidate: 1800 },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as MovieListResponse;
        data.results = data.results.filter(
          (m: any) => m.release_date && new Date(m.release_date) > new Date()
        );
        return data;
      } catch {
        if (attempt === 2) return { results: [], page: 1, total_pages: 1, total_results: 0 };
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    return { results: [], page: 1, total_pages: 1, total_results: 0 };
  },

  popular: async (page = 1) => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const cutoff = oneMonthAgo.toISOString().split("T")[0];
    return tmdbFetch<MovieListResponse>(
      "/discover/movie",
      {
        page,
        "primary_release_date.lte": cutoff, // released over a month ago
        sort_by: "popularity.desc",
      },
      { revalidate: 1800, tags: ["popular"] }
    );
  },

  movie: (id: string) =>
    tmdbFetch<any>(`/movie/${id}`, {}, {
      revalidate: 86400,
      tags: [`movie-${id}`],
    }),

  search: (query: string, page = 1) =>
    tmdbFetch<MovieListResponse>("/search/movie", { query, page }, {
      revalidate: 300,
      tags: ["search"],
    }),
};
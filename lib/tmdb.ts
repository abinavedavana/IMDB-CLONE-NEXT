const TMDB_BASE = "https://api.themoviedb.org/3";

// ─── Request coalescing cache (dedupe identical in-flight requests) 
const inflightRequests = new Map<string, Promise<any>>();
const etagCache = new Map<string, string>();
const responseCache = new Map<string, { data: any; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Circuit breaker state 
type CircuitState = "closed" | "open" | "half-open";
let circuitState: CircuitState = "closed";
let failureCount = 0;
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_TIMEOUT = 30_000; // 30s

function isCircuitOpen(): boolean {
  if (circuitState === "open") {
    if (Date.now() - lastFailureTime > CIRCUIT_RESET_TIMEOUT) {
      circuitState = "half-open";
      return false;
    }
    return true;
  }
  return false;
}

function recordSuccess() {
  failureCount = 0;
  circuitState = "closed";
}

function recordFailure() {
  failureCount++;
  lastFailureTime = Date.now();
  if (failureCount >= FAILURE_THRESHOLD) {
    circuitState = "open";
    console.warn("[TMDB] Circuit breaker OPEN");
  }
}

// ─── Exponential backoff + jitter 
async function fetchWithRetry(
  url: string,
  retries = 3,
  baseDelay = 500
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const headers: Record<string, string> = {};
      const etag = etagCache.get(url);
      if (etag) headers["If-None-Match"] = etag;

      const res = await fetch(url, {
        headers,
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(8000),
      });

      // 304 Not Modified — use cached response
      if (res.status === 304) {
        recordSuccess();
        return new Response(
          JSON.stringify(responseCache.get(url)?.data ?? {}),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Cache ETag if present
      const newEtag = res.headers.get("etag");
      if (newEtag) etagCache.set(url, newEtag);

      recordSuccess();
      return res;
    } catch (err) {
      recordFailure();
      if (attempt === retries) throw err;

      // Exponential backoff with jitter
      const jitter = Math.random() * 200;
      const delay = baseDelay * Math.pow(2, attempt) + jitter;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

// ─── Main fetch function with coalescing 
export async function tmdbFetch<T>(
  endpoint: string,
  fallback: T
): Promise<T> {
  const url = `${TMDB_BASE}${endpoint}?api_key=${process.env.TMDB_API_KEY}`;

  // Circuit breaker check
  if (isCircuitOpen()) {
    console.warn(`[TMDB] Circuit open, returning fallback for ${endpoint}`);
    return fallback;
  }

  // Return cached response if fresh
  const cached = responseCache.get(url);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.data as T;
  }

  // Coalesce identical in-flight requests
  if (inflightRequests.has(url)) {
    return inflightRequests.get(url) as Promise<T>;
  }

  const promise = fetchWithRetry(url)
    .then((res) => res.json())
    .then((data) => {
      responseCache.set(url, { data, cachedAt: Date.now() });
      inflightRequests.delete(url);
      return data as T;
    })
    .catch((err) => {
      inflightRequests.delete(url);
      console.error(`[TMDB] Failed to fetch ${endpoint}:`, err);
      return fallback;
    });

  inflightRequests.set(url, promise);
  return promise;
}

// ─── Typed TMDB fetchers 
export async function getMovie(id: string) {
  return tmdbFetch(`/movie/${id}`, null);
}

export async function getCredits(id: string) {
  return tmdbFetch(`/movie/${id}/credits`, { cast: [], crew: [] });
}

export async function getReviews(id: string) {
  return tmdbFetch(`/movie/${id}/reviews`, { results: [] });
}

export async function getTrailers(id: string) {
  return tmdbFetch(`/movie/${id}/videos`, { results: [] });
}

export async function getSimilarMovies(id: string) {
  return tmdbFetch(`/movie/${id}/similar`, { results: [] });
}

export async function getImages(id: string) {
  return tmdbFetch(`/movie/${id}/images`, { backdrops: [], posters: [] });
}
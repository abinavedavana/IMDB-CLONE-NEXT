import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import WatchlistToggle from "@/app/components/WatchlistToggle";
import TrailerCarousel from "@/app/components/TrailerCarousel";
import ReviewSystem from "@/app/components/ReviewSystem";
import {
  getMovie,
  getCredits,
  getReviews,
  getTrailers,
  getSimilarMovies,
  getImages,
} from "@/lib/tmdb";

type Props = { params: Promise<{ id: string }> };

const IMAGE_BASE = "https://image.tmdb.org/t/p/original";
const W500 = "https://image.tmdb.org/t/p/w500";

// ─── Keyed preloading of adjacent movies 
export async function generateStaticParams() {
  return [];
}

// ─── Reviews subcomponent (separate Suspense boundary) 
async function Reviews({ id }: { id: string }) {
  const data: any = await getReviews(id);
  const reviews = data?.results?.slice(0, 3) ?? [];

  if (!reviews.length) return null;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Reviews</h2>
      <div className="space-y-4">
        {reviews.map((r: any) => (
          <div key={r.id} className="bg-slate-900 p-4 rounded-xl">
            <p className="font-semibold mb-1">{r.author}</p>
            <p className="text-gray-400 text-sm line-clamp-4">{r.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Similar movies subcomponent 
async function SimilarMovies({ id }: { id: string }) {
  const data: any = await getSimilarMovies(id);
  const movies = data?.results?.slice(0, 6) ?? [];

  if (!movies.length) return null;

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-6">Similar Movies</h2>
      <div className="grid grid-cols-3 gap-4">
        {movies.map((m: any) => (
          <Link
            key={m.id}
            href={`/movie/${m.id}`}
            prefetch={true}
            className="bg-slate-900 rounded-xl overflow-hidden hover:scale-105 transition group"
          >
            {m.poster_path && (
              <div className="relative aspect-[2/3] w-full">
                <Image
                  src={`${W500}${m.poster_path}`}
                  alt={m.title}
                  fill
                  sizes="200px"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <p className="p-2 text-xs font-medium group-hover:text-yellow-400 transition line-clamp-2">
              {m.title}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Cast subcomponent 
async function Cast({ id }: { id: string }) {
  const data: any = await getCredits(id);
  const actors = data?.cast?.slice(0, 8) ?? [];

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-6">Top Cast</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {actors.map((actor: any) => (
          <Link
            key={actor.id}
            href={`/actor/${actor.id}`}
            className="bg-slate-900 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition"
          >
            {actor.profile_path && (
              <Image
                src={`${IMAGE_BASE}${actor.profile_path}`}
                alt={actor.name}
                width={60}
                height={60}
                className="rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold text-lg">{actor.name}</h3>
              <p className="text-gray-400 text-sm">{actor.character}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

async function ReviewSystemWrapper({ id }: { id: string }) {
  let initialReviews = [];
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/reviews?movieId=${id}`,
      { next: { revalidate: 30, tags: [`reviews-${id}`] } }
    );
    if (res.ok) initialReviews = await res.json();
  } catch {}
  return <ReviewSystem movieId={id} initialReviews={initialReviews} />;
}

// ─── Page
export default async function MoviePage({ params }: Props) {
  const { id } = await params;

  // Parallel fetch — all requests fire simultaneously
  const [movie, trailerData, imageData] = await Promise.all([
    getMovie(id),
    getTrailers(id),
    getImages(id),
  ]);

  if (!movie) return notFound();

  // Build carousel items — trailers first, then backdrops
  const trailers = (trailerData as any)?.results
    ?.filter((v: any) => v.site === "YouTube" && v.type === "Trailer")
    ?.slice(0, 3)
    ?.map((v: any) => ({ type: "video" as const, key: v.key })) ?? [];

  const images = (imageData as any)?.backdrops
    ?.slice(0, 5)
    ?.map((img: any) => ({
      type: "image" as const,
      src: `${W500}${img.file_path}`,
      alt: (movie as any).title,
    })) ?? [];

  const carouselItems = [...trailers, ...images];

  const m = movie as any;

  return (
    <div className="text-white bg-black min-h-screen">

      {/* ── HERO ── */}
      <section className="relative h-[80vh] w-full overflow-hidden">
        {m.backdrop_path && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${IMAGE_BASE}${m.backdrop_path})` }}
            />
            <div className="absolute inset-0 bg-gradient-r from-black via-black/70 to-transparent" />
          </>
        )}

        <div className="relative z-10 flex gap-12 px-20 pt-32">
          {m.poster_path && (
            <Image
              src={`${IMAGE_BASE}${m.poster_path}`}
              alt={m.title}
              width={280}
              height={420}
              className="rounded-2xl shadow-2xl"
              priority
            />
          )}

          <div className="max-w-3xl">
            <div className="flex gap-6 text-sm text-gray-300 mb-4">
              {m.vote_average > 0 && <span>⭐ {m.vote_average?.toFixed(1)}</span>}
              {m.runtime > 0 && <span>{m.runtime} min</span>}
              <span>{m.release_date?.slice(0, 4)}</span>
            </div>

            <h1 className="text-5xl font-bold mb-6">{m.title}</h1>

            <div className="flex gap-2 mb-8 flex-wrap">
              {m.genres?.map((g: any) => (
                <span key={g.id} className="text-xs bg-slate-800 px-3 py-1 rounded-full">
                  {g.name}
                </span>
              ))}
            </div>

            <div className="mt-6 flex gap-4 items-center">
                {new Date(m.release_date) <= new Date() ? (
                  <button className="bg-yellow-400 text-black px-6 py-3 rounded-md font-semibold hover:bg-yellow-500">
                    ▶ Watch Now
                  </button>
                ) : (
                  <div className="bg-slate-700 text-gray-300 px-6 py-3 rounded-md font-semibold cursor-default">
                    🎬 Coming Soon · {new Date(m.release_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                )}
                <WatchlistToggle
                  id={String(m.id)}
                  title={m.title}
                  poster={m.poster_path}
                  mediaType="movie"
                />
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <section className="px-20 py-16 grid grid-cols-3 gap-12">
        <div className="col-span-2 space-y-14">

          {/* Overview */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <p className="text-gray-300 leading-relaxed">{m.overview}</p>
          </div>

          {/* Trailer + Image Carousel */}
          {carouselItems.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Trailers & Images</h2>
              <TrailerCarousel items={carouselItems} />
            </div>
          )}

          {/* Cast — progressive hydration via Suspense */}
          <Suspense fallback={
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          }>
            <Cast id={id} />
          </Suspense>

          {/* Reviews — separate Suspense boundary */}
          <Suspense fallback={
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          }>
            <Reviews id={id} />
          </Suspense>


          {/* Reviews System */}
          <Suspense fallback={
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          }>
            <ReviewSystemWrapper id={id} />
          </Suspense>

          {/* Similar movies — separate Suspense boundary */}
          <Suspense fallback={
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          }>
            <SimilarMovies id={id} />
          </Suspense>
        </div>

        {/* Sidebar */}
        <aside className="bg-slate-900 p-6 rounded-xl h-fit sticky top-24">
          <h3 className="font-semibold mb-6">Movie Info</h3>
          <ul className="text-sm text-gray-300 space-y-4">
            <li><b>Language:</b> {m.original_language?.toUpperCase()}</li>
            <li><b>Status:</b> {m.status}</li>
            <li><b>Budget:</b> ${m.budget?.toLocaleString()}</li>
            <li><b>Revenue:</b> ${m.revenue?.toLocaleString()}</li>
            <li><b>Tagline:</b> {m.tagline || "—"}</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}


export const revalidate = 3600;

import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import FilmographyExplorer from "@/app/components/FilmographyExplorer";
import { Award, Twitter, Instagram, Facebook, Globe } from "lucide-react";
import WatchlistToggle from "@/app/components/WatchlistToggle";

interface Props {
  params: Promise<{ id: string }>; // ✅ KEEP PROMISE
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error("Max retries reached");
}

async function getActorData(id: string) {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return null;

    const fetchOptions = {
      next: {
        revalidate: 3600,
        tags: [`actor-${id}`],
      },
    };

    
  const [actorRes, creditsRes, socialRes, translationsRes] = await Promise.all([
    fetchWithRetry(
      `https://api.themoviedb.org/3/person/${id}?api_key=${apiKey}`,
      fetchOptions
    ),
    fetchWithRetry(
      `https://api.themoviedb.org/3/person/${id}/movie_credits?api_key=${apiKey}`,
      fetchOptions
    ),
    fetchWithRetry(
      `https://api.themoviedb.org/3/person/${id}/external_ids?api_key=${apiKey}`,
      fetchOptions
    ),
    fetchWithRetry(
      `https://api.themoviedb.org/3/person/${id}/translations?api_key=${apiKey}`,
      fetchOptions
    ),
  ]);

    if (!actorRes.ok) return null;

    const actor = await actorRes.json();
    const creditsData = creditsRes.ok ? await creditsRes.json() : null;
    const socialData = socialRes.ok ? await socialRes.json() : null;
    const translationsData = translationsRes.ok ? await translationsRes.json() : null;

    const movies = creditsData?.cast || [];
    const awards =
      movies?.filter((m: any) => m.vote_average >= 7)?.slice(0, 5) || [];

    const alternateNames = translationsData?.translations
      ?.filter((t: any) => t.data?.name && t.data.name !== actor.name)
      ?.slice(0, 5)
      ?.map((t: any) => ({
        language: t.english_name,
        name: t.data.name,
      })) || [];

    return { actor, movies, awards, socialData, alternateNames };
  } catch {
    return null;
  }
}

/*METADATA (KEEP PROMISE) */

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { id } = await params; // ✅ await required in your setup
  const data = await getActorData(id);

  if (!data) return {};

  const { actor } = data;

  return {
    title: `${actor.name} | Filmography`,
    description: actor.biography?.slice(0, 160),
    openGraph: {
      title: actor.name,
      description: actor.biography?.slice(0, 160),
      images: actor.profile_path
        ? [`https://image.tmdb.org/t/p/original${actor.profile_path}`]
        : [],
    },
  };
}

/*  PAGE COMPONENT*/

export default async function ActorPage({ params }: Props) {
  const { id } = await params; // ✅ KEEP await

  const data = await getActorData(id);

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <p className="text-xl">Failed to load actor. Please try again.</p>
        <a href="" className="bg-yellow-500 text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-400">
          Retry
        </a>
      </div>
    );
  }

  const { actor, movies, awards, socialData, alternateNames } = data;

  const socials = [
    {
      name: "Twitter",
      value: socialData?.twitter_id,
      url: `https://twitter.com/${socialData?.twitter_id}`,
      icon: <Twitter size={18} />,
    },
    {
      name: "Instagram",
      value: socialData?.instagram_id,
      url: `https://instagram.com/${socialData?.instagram_id}`,
      icon: <Instagram size={18} />,
    },
    {
      name: "Facebook",
      value: socialData?.facebook_id,
      url: `https://facebook.com/${socialData?.facebook_id}`,
      icon: <Facebook size={18} />,
    },
    {
      name: "IMDb",
      value: socialData?.imdb_id,
      url: `https://www.imdb.com/name/${socialData?.imdb_id}`,
      icon: <Globe size={18} />,
    },
  ].filter((item) => item.value);

  return (
    <div className="text-white min-h-screen bg-black">

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: actor.name,
            alternateName: alternateNames.map((a: any) => a.name),
            description: actor.biography,
            image: actor.profile_path
              ? `https://image.tmdb.org/t/p/original${actor.profile_path}`
              : undefined,
            birthDate: actor.birthday,
            birthPlace: actor.place_of_birth,
          }),
        }}
      />

      {/* HEADER */}
      <div className="relative h-[350] w-full">
        {actor.profile_path && (
          <Image
            src={`https://image.tmdb.org/t/p/original${actor.profile_path}`}
            alt={actor.name}
            fill
            sizes="100vw"
            className="object-cover opacity-30"
            priority
          />
        )}

        <div className="absolute bottom-10 left-10 flex items-end gap-6">
          {actor.profile_path && (
            <Image
              src={`https://image.tmdb.org/t/p/w500${actor.profile_path}`}
              alt={actor.name}
              width={160}
              height={208}
              priority
              loading="eager"
              className="rounded-xl border-4 border-gray-800"
            />
          )}

          <div>
            <h1 className="text-4xl font-bold">{actor.name}</h1>
            <p className="text-yellow-400 mt-2">
              🎬 {movies.length} Movies
            </p>

            <div className="mt-4">
              <WatchlistToggle
                id={actor.id.toString()}
                title={actor.name}
                poster={
                  actor.profile_path
                    ? `https://image.tmdb.org/t/p/w500${actor.profile_path}`
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">

        {/* LEFT */}
        <div className="space-y-8">

          <div className="bg-gray-900 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Personal Info</h2>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-400">Born</p>
                <p>{actor.birthday || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-400">Place of Birth</p>
                <p>{actor.place_of_birth || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-400">Known For</p>
                <p>{actor.known_for_department || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-400">Popularity</p>
                <p>{actor.popularity}</p>
              </div>
              {alternateNames.length > 0 && (
                <div>
                  <p className="text-gray-400">Also Known As</p>
                  <div className="space-y-1 mt-1">
                    {alternateNames.map((alt: any) => (
                      <div key={alt.language} className="flex justify-between">
                        <span className="text-xs text-gray-500">{alt.language}</span>
                        <span className="text-sm">{alt.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-900 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-6">
              Awards & Nominations
            </h2>

            {awards.length > 0 ? (
              <div className="space-y-4">
                {awards.map((movie: any) => (
                  <div
                    key={movie.id}
                    className="bg-slate-800 rounded-lg p-4 flex gap-3 items-start"
                  >
                    <Award className="text-yellow-400" size={18} />
                    <div>
                      <p className="font-semibold">
                        Award Nomination |{" "}
                        {movie.release_date?.slice(0, 4) || "N/A"}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Best Actor – {movie.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                No major award nominations found.
              </p>
            )}
          </div>

          <div className="bg-gray-900 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Social</h2>

            {socials.length > 0 ? (
              <div className="space-y-3">
                {socials.map((item) => (
                  <Link
                    key={item.name}
                    href={item.url}
                    target="_blank"
                    className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg hover:bg-slate-700"
                  >
                    {item.icon}
                    <span>@{item.value}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                No social accounts available.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="md:col-span-2 space-y-12">

          <div>
            <h2 className="text-2xl font-semibold mb-4">Biography</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {actor.biography || "No biography available."}
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-6">Movies</h2>
            <FilmographyExplorer movies={movies} />
          </div>

        </div>
      </div>
    </div>
  );
}
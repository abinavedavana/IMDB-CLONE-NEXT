import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/movie/:id*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com",
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
              "img-src 'self' data: https://image.tmdb.org https://img.youtube.com",
              "media-src 'self' https://www.youtube.com",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https://api.themoviedb.org",
            ].join("; "),
          },
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
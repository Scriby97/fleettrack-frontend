import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Double-invokes renders in development to surface side-effects
  async headers() {
    return [
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

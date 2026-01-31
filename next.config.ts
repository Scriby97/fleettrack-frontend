import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Explicitly set (on by default in dev, off in prod)
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

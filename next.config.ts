import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  // Disable Turbopack for PWA compatibility (or add empty turbopack config)
  turbopack: {},
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // Cache static assets (JS, CSS, fonts, images)
      urlPattern: /^https?.*\.(js|css|woff2?|png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      // API calls: ALWAYS network, NEVER cache (prevent stale data with sleeping backend)
      urlPattern: /^https?:\/\/.*\/api\/.*/i,
      handler: 'NetworkOnly',
    },
    {
      // External API calls (your backend): ALWAYS network only
      urlPattern: /^https?:\/\/.*\.(onrender\.com|your-domain\.com)\/.*/i,
      handler: 'NetworkOnly',
    },
  ],
})(nextConfig);

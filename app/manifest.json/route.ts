import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: 'FleetTrack - Flottenverwaltung',
    short_name: 'FleetTrack',
    description: 'Verwalte deine Fahrzeugflotte und Nutzungen mit FleetTrack',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6366f1',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192x192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: ['productivity', 'business'],
    scope: '/',
    lang: 'de-DE',
    dir: 'ltr',
  };

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}

export const dynamic = 'force-static';

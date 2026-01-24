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
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}

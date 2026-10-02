import { updateSession } from './lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt / sitemap.xml (app/robots.ts, app/sitemap.ts - muessen fuer
     *   Suchmaschinen-Crawler ohne Login-Redirect erreichbar sein)
     * - manifest.webmanifest (PWA manifest)
     * - sw.js (Service Worker)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest\\.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

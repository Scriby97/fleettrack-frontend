import type { MetadataRoute } from 'next'

// Fast die ganze App liegt hinter dem Login (siehe lib/supabase/middleware.ts -
// alles ausser /login, /register, /auth, /reset-password, /impressum,
// /datenschutz, /agb leitet nicht angemeldete Besucher dorthin um). Fuer
// Suchmaschinen gibt es also nur diese oeffentlichen Seiten zu indexieren -
// der Rest waere ohnehin nur ein Redirect auf /login.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/login', '/register', '/impressum', '/datenschutz', '/agb'],
      disallow: '/',
    },
    sitemap: 'https://fleettrack.ch/sitemap.xml',
  }
}

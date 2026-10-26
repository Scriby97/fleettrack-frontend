import type { MetadataRoute } from 'next'

// Fast die ganze App liegt hinter dem Login (siehe lib/supabase/middleware.ts -
// alles ausser /login, /register, /auth, /reset-password, /impressum,
// /datenschutz, /agb leitet nicht angemeldete Besucher dorthin um) - fuer
// Crawler ohne Session ist ein Aufruf jeder gesperrten Route also ohnehin nur
// ein Redirect auf /login, nichts Sensibles wird dadurch sichtbar. Deshalb
// hier bewusst NICHT pauschal disallowen: "/" ist extern verlinkt (z.B. von
// deerworks.ch) und war schon vor diesem robots.txt bei Google bekannt - ein
// "Disallow: /" haette genau das erzeugt, was Search Console als "Indexiert,
// obwohl durch robots.txt-Datei blockiert" meldet.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://www.fleettrack.ch/sitemap.xml',
  }
}

import type { Metadata } from 'next'

// page.tsx ist 'use client' - der metadata-Export muss daher aus diesem
// Server-Component-Layout kommen, sonst erbt die Seite nur den generischen
// Titel/Description aus dem Root-Layout (gilt dann identisch fuer /login,
// /register, /impressum, /datenschutz, /agb - schlecht fuer Google und wenig
// aussagekraeftig, wenn jemand "FleetTrack" nach einer Kaltakquise-Mail googelt).
export const metadata: Metadata = {
  title: 'Anmelden – FleetTrack',
  description:
    'FleetTrack: Betriebsstunden und Diesel pro Pistenfahrzeug in Sekunden erfassen – für eine lückenlose Mineralölsteuer-Rückerstattung.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}

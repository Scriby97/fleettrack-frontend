import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Registrieren – FleetTrack',
  description:
    'FleetTrack: Betriebsstunden und Diesel pro Pistenfahrzeug in Sekunden erfassen – für eine lückenlose Mineralölsteuer-Rückerstattung. Jetzt kostenlos registrieren.',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}

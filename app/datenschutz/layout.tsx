import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung – FleetTrack',
}

export default function DatenschutzLayout({ children }: { children: React.ReactNode }) {
  return children
}

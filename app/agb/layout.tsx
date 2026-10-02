import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AGB – FleetTrack',
}

export default function AgbLayout({ children }: { children: React.ReactNode }) {
  return children
}

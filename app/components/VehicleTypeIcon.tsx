import type { ReactElement } from 'react'

/**
 * Linien-Icon für einen Fahrzeugtyp, im gleichen Stil wie die Settings-Icons
 * (viewBox 0 0 24 24, fill none, currentColor-Stroke, runde Enden).
 *
 * - variant "plain": nur das Fahrzeug-Glyph (Flottenübersicht)
 * - variant "document": das Fahrzeug-Glyph auf einem Rapport-/Dokumentumriss
 *   (erfasste Nutzungen - eine gemeldete Fahrt)
 *
 * `type` sind die Werte aus dem Fahrzeug-Formular ("Pistenfahrzeug", "Skidoo",
 * "Quad"); alles andere/leer fällt auf ein generisches Fahrzeug zurück.
 */

type Kind = 'groomer' | 'skidoo' | 'quad' | 'generic'

interface VehicleTypeIconProps {
  type?: string | null
  variant?: 'plain' | 'document'
  className?: string
}

function normalize(type?: string | null): Kind {
  const key = (type ?? '').trim().toLowerCase()
  if (key === 'pistenfahrzeug' || key === 'groomer' || key === 'snowcat') return 'groomer'
  if (key === 'skidoo' || key === 'ski-doo' || key === 'snowmobile' || key === 'motorschlitten') return 'skidoo'
  if (key === 'quad' || key === 'atv') return 'quad'
  return 'generic'
}

function glyph(kind: Kind): ReactElement {
  switch (kind) {
    case 'groomer':
      return (
        <>
          <rect x="2.5" y="13.8" width="14.5" height="6.2" rx="3.1" />
          <circle cx="5.8" cy="16.9" r="0.9" />
          <circle cx="9.7" cy="16.9" r="0.9" />
          <circle cx="13.6" cy="16.9" r="0.9" />
          <path d="M5.8 13.8V9.6A1.6 1.6 0 0 1 7.4 8h4.6A1.6 1.6 0 0 1 13.6 9.6v4.2" />
          <path d="M6.8 11.1h5.8" />
          <path d="M17 12.7l2.6 1.2" />
          <path d="M19.4 13.2v4.4" />
          <path d="M18.1 17.4h3" />
        </>
      )
    case 'skidoo':
      return (
        <>
          <path d="M3 18.5h7" />
          <path d="M3 18.5c-0.9-1.7 0.7-2.5 2.1-2" />
          <path d="M6.5 18.5h7.5a4 4 0 0 0 3.7-2.6l0.8-2.4" />
          <path d="M8.5 18.5l2.6-6.4h3.6a2.4 2.4 0 0 1 2.3 1.7" />
          <path d="M10.3 12.6l0.9-3 2 0" />
        </>
      )
    case 'quad':
      return (
        <>
          <circle cx="6" cy="16.8" r="3" />
          <circle cx="18" cy="16.8" r="3" />
          <path d="M4.6 13.9c1-3.4 3.1-4.2 5.6-4.2h3.3c3.4 0 4.6 1.9 5 4.2" />
          <path d="M9 9.6L7.6 7.1h3.6" />
          <path d="M13.4 10.3c2.6-1.2 4.3-0.4 5.2 1" />
        </>
      )
    default:
      return (
        <>
          <path d="M2.5 8h10.5v9H2.5z" />
          <path d="M13 11h4l3.5 3.2V17H13z" />
          <circle cx="7" cy="18.5" r="2.1" />
          <circle cx="17" cy="18.5" r="2.1" />
        </>
      )
  }
}

export function VehicleTypeIcon({
  type,
  variant = 'plain',
  className = 'w-8 h-8',
}: VehicleTypeIconProps) {
  const kind = normalize(type)

  const svgProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }

  if (variant === 'document') {
    return (
      <svg {...svgProps}>
        {/* Rapport-/Dokumentumriss mit umgeknickter Ecke + zwei Textzeilen */}
        <path d="M4 2.2h9L20 8.4v13A1.6 1.6 0 0 1 18.4 22.9H5.6A1.6 1.6 0 0 1 4 21.3V3.8A1.6 1.6 0 0 1 5.6 2.2Z" />
        <path d="M12.7 2.2v5.4h5.4" />
        <path d="M7.5 18.7h7" />
        <path d="M7.5 20.8h4.5" />
        {/* gemeldetes Fahrzeug, verkleinert in die obere Hälfte gesetzt */}
        <g transform="translate(6 2.7) scale(0.5)" strokeWidth={3.2}>
          {glyph(kind)}
        </g>
      </svg>
    )
  }

  return <svg {...svgProps}>{glyph(kind)}</svg>
}

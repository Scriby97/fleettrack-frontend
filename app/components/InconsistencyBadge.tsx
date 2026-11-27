'use client';

import { useTranslations } from 'next-intl';

interface InconsistencyBadgeProps {
  className?: string;
  /** Ueberschreibt den Standardtext (Luecken/Ueberschneidungen) - z.B. fuer
   *  den "Startwert fehlt noch"-Hinweis, der denselben Badge wiederverwendet. */
  label?: string;
}

// Kleines "!"-Warnsymbol - einheitlich verwendet in Navigation (Sidebar/
// BottomNav), Flottenuebersicht (pro Fahrzeug) und der Fahrzeug-Detailseite,
// sowohl fuer Luecken/Ueberschneidungen zwischen Nutzungen (Standardtext) als
// auch fuer Fahrzeuge ohne Startwert (siehe label-Prop). Bewusst als SVG
// gezeichnet statt als Textzeichen: in der Desktop-Schrift wirkte ein "!" bei
// dieser Groesse wie eine "1".
export function InconsistencyBadge({ className = '', label }: InconsistencyBadgeProps) {
  const t = useTranslations('common');
  const resolvedLabel = label ?? t('inconsistentUsagesWarning');
  return (
    <span
      title={resolvedLabel}
      aria-label={resolvedLabel}
      role="img"
      className={`inline-flex items-center justify-center w-4 h-4 shrink-0 rounded-full bg-red-500 text-white ${className}`}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
        <rect x="4" y="1" width="2" height="5" rx="1" />
        <circle cx="5" cy="8.2" r="1.1" />
      </svg>
    </span>
  );
}

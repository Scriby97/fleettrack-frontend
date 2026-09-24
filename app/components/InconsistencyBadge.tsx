'use client';

import { useTranslations } from 'next-intl';

interface InconsistencyBadgeProps {
  className?: string;
}

// Kleines "!"-Warnsymbol fuer Luecken/Ueberschneidungen zwischen Nutzungen -
// einheitlich verwendet in Navigation (Sidebar/BottomNav), Flottenuebersicht
// (pro Fahrzeug) und dem Nutzungen-Tab der Fahrzeug-Detailseite. Bewusst als
// SVG gezeichnet statt als Textzeichen: in der Desktop-Schrift wirkte ein "!"
// bei dieser Groesse wie eine "1".
export function InconsistencyBadge({ className = '' }: InconsistencyBadgeProps) {
  const t = useTranslations('common');
  return (
    <span
      title={t('inconsistentUsagesWarning')}
      aria-label={t('inconsistentUsagesWarning')}
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

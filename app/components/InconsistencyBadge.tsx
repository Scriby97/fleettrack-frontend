'use client';

import { useTranslations } from 'next-intl';

interface InconsistencyBadgeProps {
  className?: string;
}

// Kleines "!"-Warnsymbol fuer Luecken/Ueberschneidungen zwischen Nutzungen -
// einheitlich verwendet in Navigation (Sidebar/BottomNav), Flottenuebersicht
// (pro Fahrzeug) und dem Nutzungen-Tab der Fahrzeug-Detailseite.
export function InconsistencyBadge({ className = '' }: InconsistencyBadgeProps) {
  const t = useTranslations('common');
  return (
    <span
      title={t('inconsistentUsagesWarning')}
      aria-label={t('inconsistentUsagesWarning')}
      className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none ${className}`}
    >
      !
    </span>
  );
}

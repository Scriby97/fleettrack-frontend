'use client';

import type { FC } from 'react';
import { useTranslations } from 'next-intl';
import type { CreatorFilter } from '@/lib/hooks/useCreatorFilter';

/** Auswahl "Erfasst von" ueber Nutzungslisten (siehe useCreatorFilter). */
export const CreatorFilterSelect: FC<{ id: string; filter: CreatorFilter }> = ({ id, filter }) => {
  const t = useTranslations('usagesOverview');
  if (!filter.visible) return null;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
        {t('createdByLabel')}
      </label>
      <select
        id={id}
        value={filter.creatorId ?? ''}
        onChange={(e) => filter.setCreatorId(e.target.value)}
        className="flex-1 min-w-0 sm:flex-initial px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500"
      >
        <option value="">{t('allCreators')}</option>
        {filter.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
};

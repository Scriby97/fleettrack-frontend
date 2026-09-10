'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useOrganization } from '@/lib/contexts/OrganizationContext'
import { OrgAvatar } from './OrgAvatar'

/**
 * Kopf-Chip der Seitenleiste: zeigt die aktuell ausgewählte Organisation
 * (Logo + Name). Gehört der User mehreren Organisationen an, ist der Chip ein
 * Button, der ein Auswahl-Menü zum Wechseln öffnet. Bei nur einer Organisation
 * ist es reine Anzeige.
 */
export function OrgSwitcher() {
  const t = useTranslations('common')
  const { organization } = useAuth()
  const { organizations, selectedOrgId, setSelectedOrgId } = useOrganization()

  const selectedOrg =
    organizations.find((org) => org.id === selectedOrgId) ?? organization ?? null
  const name = selectedOrg?.name ?? 'FleetTrack'
  const logoUrl = selectedOrg?.logoUrl ?? null
  const canSwitch = organizations.length > 1

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const chipClass =
    'flex items-center gap-2 w-full min-w-0 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-2'

  const chipInner = (
    <>
      <OrgAvatar name={name} logoUrl={logoUrl} size={24} />
      <span className="flex-1 truncate text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {name}
      </span>
      {canSwitch && (
        <svg
          className="h-4 w-4 shrink-0 text-zinc-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
        </svg>
      )}
    </>
  )

  if (!canSwitch) {
    return <div className={chipClass}>{chipInner}</div>
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`${chipClass} transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700/60`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t('switchOrganization')}
      >
        {chipInner}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('switchOrganization')}
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1 shadow-lg"
        >
          {organizations.map((org) => {
            const active = org.id === selectedOrgId
            return (
              <button
                key={org.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setSelectedOrgId(org.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  active
                    ? 'font-semibold text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <OrgAvatar name={org.name} logoUrl={org.logoUrl} size={22} />
                <span className="flex-1 truncate">{org.name}</span>
                {active && (
                  <svg
                    className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

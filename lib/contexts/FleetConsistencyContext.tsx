'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FC, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { getInconsistentVehicleIds, getVehicleIdsWithoutStartingReading } from '@/lib/api/vehicles'
import { useOrganization } from './OrganizationContext'

interface FleetConsistencyContextValue {
  // IDs der Fahrzeuge mit mindestens einer Luecke/Ueberschneidung zwischen
  // zwei chronologisch aufeinanderfolgenden Nutzungen.
  inconsistentVehicleIds: Set<string>
  hasInconsistentUsages: boolean
  // IDs der Fahrzeuge ganz ohne Nutzung (auch nicht die Referenz-Nutzung) -
  // brauchen noch einen Startwert (siehe "Startwert bearbeiten").
  vehiclesWithoutStartingReadingIds: Set<string>
  hasVehiclesWithoutStartingReading: boolean
  /**
   * Text fuers "!"-Badge (InconsistencyBadge label-Prop): kombiniert beide
   * Warnungen, falls beide zutreffen. Ohne vehicleId fuer die Flotten-weite
   * Navigation (Sidebar/BottomNav), mit vehicleId fuer ein einzelnes
   * Fahrzeug (Flottenuebersicht-Karte, Fahrzeug-Detailseite). Gibt undefined
   * zurueck, wenn keine der beiden Warnungen zutrifft - dann kein Badge zeigen.
   */
  getWarningLabel: (vehicleId?: string) => string | undefined
  refresh: () => Promise<void>
}

const FleetConsistencyContext = createContext<FleetConsistencyContextValue | undefined>(undefined)

export const FleetConsistencyProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const t = useTranslations('common')
  // Nur Admin/Owner (bzw. globale Administratoren) sollen die "!"-Badges sehen -
  // canManageSelectedOrganization deckt genau das ab (siehe OrganizationContext).
  const { selectedOrgId, canManageSelectedOrganization } = useOrganization()
  const [inconsistentVehicleIds, setInconsistentVehicleIds] = useState<Set<string>>(new Set())
  const [vehiclesWithoutStartingReadingIds, setVehiclesWithoutStartingReadingIds] = useState<Set<string>>(
    new Set(),
  )

  const refresh = useCallback(async () => {
    if (!selectedOrgId || !canManageSelectedOrganization) return
    try {
      const [inconsistentIds, missingStartingReadingIds] = await Promise.all([
        getInconsistentVehicleIds(selectedOrgId),
        getVehicleIdsWithoutStartingReading(selectedOrgId),
      ])
      setInconsistentVehicleIds(new Set(inconsistentIds))
      setVehiclesWithoutStartingReadingIds(new Set(missingStartingReadingIds))
    } catch {
      // Stilles Scheitern - die "!"-Badges sind nur ein Hinweis-Feature, keine
      // kritische Ladung, die eine eigene Fehleranzeige braucht.
    }
  }, [selectedOrgId, canManageSelectedOrganization])

  useEffect(() => {
    if (!selectedOrgId || !canManageSelectedOrganization) {
      setInconsistentVehicleIds(new Set())
      setVehiclesWithoutStartingReadingIds(new Set())
      return
    }
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId, canManageSelectedOrganization])

  const getWarningLabel = useCallback(
    (vehicleId?: string): string | undefined => {
      const hasInconsistent = vehicleId
        ? inconsistentVehicleIds.has(vehicleId)
        : inconsistentVehicleIds.size > 0
      const hasMissingStart = vehicleId
        ? vehiclesWithoutStartingReadingIds.has(vehicleId)
        : vehiclesWithoutStartingReadingIds.size > 0

      if (hasInconsistent && hasMissingStart) {
        return `${t('inconsistentUsagesWarning')} / ${t('missingStartingReadingWarning')}`
      }
      if (hasInconsistent) return t('inconsistentUsagesWarning')
      if (hasMissingStart) return t('missingStartingReadingWarning')
      return undefined
    },
    [inconsistentVehicleIds, vehiclesWithoutStartingReadingIds, t]
  )

  const value = useMemo<FleetConsistencyContextValue>(
    () => ({
      inconsistentVehicleIds,
      hasInconsistentUsages: inconsistentVehicleIds.size > 0,
      vehiclesWithoutStartingReadingIds,
      hasVehiclesWithoutStartingReading: vehiclesWithoutStartingReadingIds.size > 0,
      getWarningLabel,
      refresh,
    }),
    [inconsistentVehicleIds, vehiclesWithoutStartingReadingIds, getWarningLabel, refresh]
  )

  return <FleetConsistencyContext.Provider value={value}>{children}</FleetConsistencyContext.Provider>
}

export function useFleetConsistency(): FleetConsistencyContextValue {
  const ctx = useContext(FleetConsistencyContext)
  if (!ctx) {
    throw new Error('useFleetConsistency must be used within a FleetConsistencyProvider')
  }
  return ctx
}

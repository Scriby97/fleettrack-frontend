'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FC, type ReactNode } from 'react'
import { getInconsistentVehicleIds } from '@/lib/api/vehicles'
import { useOrganization } from './OrganizationContext'

interface FleetConsistencyContextValue {
  // IDs der Fahrzeuge mit mindestens einer Luecke/Ueberschneidung zwischen
  // zwei chronologisch aufeinanderfolgenden Nutzungen.
  inconsistentVehicleIds: Set<string>
  hasInconsistentUsages: boolean
  refresh: () => Promise<void>
}

const FleetConsistencyContext = createContext<FleetConsistencyContextValue | undefined>(undefined)

export const FleetConsistencyProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Nur Admin/Owner (bzw. globale Administratoren) sollen die "!"-Badges sehen -
  // canManageSelectedOrganization deckt genau das ab (siehe OrganizationContext).
  const { selectedOrgId, canManageSelectedOrganization } = useOrganization()
  const [inconsistentVehicleIds, setInconsistentVehicleIds] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!selectedOrgId || !canManageSelectedOrganization) return
    try {
      const vehicleIds = await getInconsistentVehicleIds(selectedOrgId)
      setInconsistentVehicleIds(new Set(vehicleIds))
    } catch {
      // Stilles Scheitern - das "!"-Badge ist nur ein Hinweis-Feature, keine
      // kritische Ladung, die eine eigene Fehleranzeige braucht.
    }
  }, [selectedOrgId, canManageSelectedOrganization])

  useEffect(() => {
    if (!selectedOrgId || !canManageSelectedOrganization) {
      setInconsistentVehicleIds(new Set())
      return
    }
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId, canManageSelectedOrganization])

  const value = useMemo<FleetConsistencyContextValue>(
    () => ({
      inconsistentVehicleIds,
      hasInconsistentUsages: inconsistentVehicleIds.size > 0,
      refresh,
    }),
    [inconsistentVehicleIds, refresh]
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

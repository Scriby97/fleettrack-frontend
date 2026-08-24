'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { getAllOrganizations } from '@/lib/api/organizations';
import type { Organization, OrganizationRole } from '@/lib/types/user';
import { useAuth } from '@/lib/auth/AuthProvider';

const SELECTED_ORG_STORAGE_KEY = 'fleettrack:selectedOrgId';

interface OrganizationContextType {
  organizations: Organization[];
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string | null) => void;
  // Rolle des Users in der AKTUELL AUSGEWÄHLTEN Organisation (nicht in der ersten
  // Mitgliedschaft) - null für globale Administratoren (die keine eigene
  // Mitgliedschaft brauchen) oder falls (noch) keine Organisation ausgewählt ist.
  selectedOrganizationRole: OrganizationRole | null;
  // isAdmin (global, Entwickler-Account) ODER admin/owner in der ausgewählten
  // Organisation - für UI-Gating (Flottenübersicht, Fahrzeug erstellen, etc.),
  // das auf die AKTUELL AUSGEWÄHLTE Organisation reagieren muss, nicht auf die
  // erste Mitgliedschaft.
  canManageSelectedOrganization: boolean;
  isLoading: boolean;
  error: string | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAdmin, organizationId, organizationMemberships } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Use a ref so loading once doesn't add itself to the effect dependency array
  const hasLoadedRef = useRef(false);

  // Persist the user's choice so it survives reloads, and so the sidebar/menu
  // switcher stays in sync with every component reading from this context.
  const setSelectedOrgId = useCallback((id: string | null) => {
    setSelectedOrgIdState(id);
    try {
      if (id) {
        window.localStorage.setItem(SELECTED_ORG_STORAGE_KEY, id);
      } else {
        window.localStorage.removeItem(SELECTED_ORG_STORAGE_KEY);
      }
    } catch {
      // localStorage nicht verfügbar (z.B. Private Mode) - Auswahl gilt dann nur für diese Sitzung
    }
  }, []);

  // Administratoren (Entwickler-Accounts): alle Organisationen system-weit laden,
  // unabhängig von eigenen Mitgliedschaften (Administratoren müssen keiner
  // Organisation angehören, um auf sie zugreifen zu können).
  useEffect(() => {
    if (!isAdmin || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const orgs = await getAllOrganizations();
        setOrganizations(orgs);
        setSelectedOrgIdState((current) => current ?? orgs[0]?.id ?? null);
      } catch (err) {
        console.error('Fehler beim Laden der Organisationen:', err);
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Organisationen');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  // Normale User: eigene Organisation(en) direkt aus den bereits geladenen
  // Memberships übernehmen - kein zusätzlicher API-Call nötig, und reagiert
  // automatisch, wenn der User eine weitere Organisation erstellt/annimmt.
  useEffect(() => {
    if (isAdmin) return;
    const ownOrganizations = organizationMemberships
      .map((membership) => membership.organization)
      .filter((org): org is Organization => Boolean(org));
    setOrganizations(ownOrganizations);
  }, [isAdmin, organizationMemberships]);

  // Normale User: Auswahl bestimmen/validieren - bevorzugt die zuletzt gewählte
  // (persistierte) Organisation, sonst die erste eigene Mitgliedschaft. Fällt
  // automatisch zurück, falls die bisherige Auswahl keine Mitgliedschaft mehr ist.
  useEffect(() => {
    if (isAdmin || organizations.length === 0) return;

    setSelectedOrgIdState((current) => {
      if (current && organizations.some((org) => org.id === current)) {
        return current;
      }

      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(SELECTED_ORG_STORAGE_KEY);
      } catch {
        // ignore
      }
      if (stored && organizations.some((org) => org.id === stored)) {
        return stored;
      }

      return organizationId ?? organizations[0].id;
    });
  }, [isAdmin, organizations, organizationId]);

  const selectedMembership = organizationMemberships.find(
    (membership) => membership.organizationId === selectedOrgId,
  );
  const selectedOrganizationRole = selectedMembership?.role ?? null;
  const canManageSelectedOrganization =
    isAdmin ||
    selectedOrganizationRole === 'admin' ||
    selectedOrganizationRole === 'owner';

  return (
    <OrganizationContext.Provider value={{
      organizations,
      selectedOrgId,
      setSelectedOrgId,
      selectedOrganizationRole,
      canManageSelectedOrganization,
      isLoading,
      error,
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

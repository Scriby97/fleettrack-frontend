'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { getAllOrganizations } from '@/lib/api/organizations';
import type { Organization } from '@/lib/types/user';
import { useAuth } from '@/lib/auth/AuthProvider';

interface OrganizationContextType {
  organizations: Organization[];
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string | null) => void;
  isLoading: boolean;
  error: string | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isSuperAdmin, organizationId } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Use a ref so loading once doesn't add itself to the effect dependency array
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isSuperAdmin && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      const load = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const orgs = await getAllOrganizations();
          setOrganizations(orgs);
          if (orgs.length > 0 && !selectedOrgId) {
            setSelectedOrgId(orgs[0].id);
          }
        } catch (err) {
          console.error('Fehler beim Laden der Organisationen:', err);
          setError(err instanceof Error ? err.message : 'Fehler beim Laden der Organisationen');
        } finally {
          setIsLoading(false);
        }
      };
      load();
    } else if (!isSuperAdmin && organizationId && !selectedOrgId) {
      setSelectedOrgId(organizationId);
    }
  }, [isSuperAdmin, organizationId, selectedOrgId]);

  return (
    <OrganizationContext.Provider value={{
      organizations,
      selectedOrgId,
      setSelectedOrgId,
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

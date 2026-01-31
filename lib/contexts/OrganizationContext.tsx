'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load organizations only once on mount or when auth status changes
  useEffect(() => {
    console.log('[ORG_CONTEXT] useEffect triggered', { isSuperAdmin, organizationId, hasLoaded, selectedOrgId });
    
    if (isSuperAdmin && !hasLoaded) {
      console.log('[ORG_CONTEXT] Loading organizations...');
      setIsLoading(true);
      setError(null);
      
      getAllOrganizations()
        .then(orgs => {
          console.log('[ORG_CONTEXT] Organizations loaded:', orgs.length);
          setOrganizations(orgs);
          setHasLoaded(true);
          // Set first org as default if none selected
          if (orgs.length > 0) {
            setSelectedOrgId(orgs[0].id);
          }
        })
        .catch(err => {
          console.error('[ORG_CONTEXT] Failed to load organizations:', err);
          setError(err.message);
        })
        .finally(() => setIsLoading(false));
    } else if (!isSuperAdmin && organizationId && !selectedOrgId) {
      // Regular admin/user - use their organization
      console.log('[ORG_CONTEXT] Setting org for regular user:', organizationId);
      setSelectedOrgId(organizationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, organizationId]);

  return (
    <OrganizationContext.Provider value={{
      organizations,
      selectedOrgId,
      setSelectedOrgId,
      isLoading,
      error
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

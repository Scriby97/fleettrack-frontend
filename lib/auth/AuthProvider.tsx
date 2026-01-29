'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { authenticatedFetch } from '@/lib/api/authenticatedFetch'
import { checkBackendHealth } from '@/lib/api/healthCheck'
import type { User, Organization } from '@/lib/types/user'

interface UserProfile {
  id: string
  email: string
  role: string
  organizationId: string
  organization: Organization
  firstName?: string
  lastName?: string
  name?: string
}

interface AuthContextType {
  supabaseUser: SupabaseUser | null
  userProfile: UserProfile | null
  loading: boolean
  backendLoading: boolean
  backendRetryCount: number
  isAdmin: boolean
  isSuperAdmin: boolean
  userRole: string | null
  organizationId: string | null
  organization: Organization | null
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, metadata?: { fullName?: string, role?: string }) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshUserRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [backendLoading, setBackendLoading] = useState(false)
  const [backendRetryCount, setBackendRetryCount] = useState(0)
  const [userRole, setUserRole] = useState<string | null>(null)
  const supabase = createClient()

  // Compute derived values
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'
  const isSuperAdmin = userRole === 'super_admin'
  const organizationId = userProfile?.organizationId ?? null
  const organization = userProfile?.organization ?? null

  // Function to fetch user profile from backend
  const fetchUserRole = useCallback(async () => {
    // Set loading at the very beginning, before any async operations
    setBackendLoading(true)
    setBackendRetryCount(0)
    
    try {
      console.log('[AUTH_PROVIDER] fetchUserRole gestartet');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (!apiUrl) {
        console.warn('NEXT_PUBLIC_API_URL nicht konfiguriert')
        setBackendLoading(false)
        return null
      }

      const healthCheckStart = performance.now();
      console.log('[AUTH_PROVIDER] Prüfe Backend-Verfügbarkeit via Health-Check...');
      
      // First, check if backend is available using lightweight health check
      const healthResult = await checkBackendHealth({
        retries: 8,
        retryDelay: 2000,
        useExponentialBackoff: true,
        onRetry: (attempt: number, maxRetries: number) => {
          console.log(`[AUTH_PROVIDER] Backend Health-Check Retry ${attempt}/${maxRetries}`);
          setBackendRetryCount(attempt)
        }
      });
      
      const healthCheckDuration = Math.round(performance.now() - healthCheckStart);
      
      if (!healthResult.available) {
        console.error(`[AUTH_PROVIDER] Backend nicht verfügbar nach Health-Check (${healthCheckDuration}ms)`);
        setBackendLoading(false)
        setBackendRetryCount(0)
        return null
      }
      
      console.log(`[AUTH_PROVIDER] Backend verfügbar nach ${healthCheckDuration}ms (cached: ${healthResult.cached || false}), rufe /auth/me auf...`);
      
      // Backend is available, now fetch actual user data
      const response = await authenticatedFetch(`${apiUrl}/auth/me`, {
        retries: 2, // Nur 2 Retries da Backend bereits verfügbar ist
        retryDelay: 1000,
        skipLoadingIndicator: true,
      })
      
      console.log('[AUTH_PROVIDER] /auth/me Response Status:', response.status);
      
      if (!response.ok) {
        console.error('Fehler beim Abrufen der User-Rolle:', response.status)
        setBackendLoading(false)
        setBackendRetryCount(0)
        return null
      }

      const profile: UserProfile = await response.json()
      console.log('[AUTH_PROVIDER] User-Profile erhalten:', profile.email, 'Role:', profile.role, 'Org:', profile.organization?.name);
      
      // Update full profile in state
      setUserProfile(profile)
      
      // Hide loading overlay after profile is loaded
      setBackendLoading(false)
      setBackendRetryCount(0)
      
      return profile.role
    } catch (error) {
      console.error('[AUTH_PROVIDER] Fehler beim Abrufen der User-Rolle:', error)
      setBackendLoading(false)
      setBackendRetryCount(0)
      return null
    }
  }, [])

  // Function to refresh user role
  const refreshUserRole = useCallback(async () => {
    if (!supabaseUser) {
      setUserRole(null)
      setUserProfile(null)
      return
    }

    const roleFromBackend = await fetchUserRole()
    if (roleFromBackend) {
      setUserRole(roleFromBackend)
    } else {
      // Fallback to metadata if backend not available
      setUserRole(supabaseUser.user_metadata?.role ?? null)
    }
  }, [supabaseUser, fetchUserRole])

  useEffect(() => {
    // Check active sessions and sets the user
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSupabaseUser(session?.user ?? null)
      
      if (session?.user) {
        // Get role from backend
        const roleFromBackend = await fetchUserRole()
        if (roleFromBackend) {
          setUserRole(roleFromBackend)
        } else {
          // Fallback to metadata
          setUserRole(session.user.user_metadata?.role ?? null)
        }
        // Wait a tick to ensure userProfile state has been updated
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      
      setLoading(false)
    }

    initAuth()

    // Listen for changes on auth state (login, logout, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH_PROVIDER] onAuthStateChange Event:', event, 'User:', session?.user?.email);
      setSupabaseUser(session?.user ?? null)
      
      if (session?.user) {
        // Get role from backend
        const roleFromBackend = await fetchUserRole()
        if (roleFromBackend) {
          console.log('[AUTH_PROVIDER] Setze userRole auf:', roleFromBackend);
          setUserRole(roleFromBackend)
        } else {
          // On error: keep old role if available
          console.log('[AUTH_PROVIDER] Konnte Rolle nicht vom Backend holen');
          setUserRole(prev => {
            const fallbackRole = session.user.user_metadata?.role ?? prev ?? null;
            console.log('[AUTH_PROVIDER] Behalte/setze userRole:', fallbackRole, '(previous:', prev, ')');
            return fallbackRole;
          })
        }
        // Wait a tick to ensure userProfile state has been updated
        await new Promise(resolve => setTimeout(resolve, 0))
      } else {
        console.log('[AUTH_PROVIDER] Keine Session, setze userRole auf null');
        setUserRole(null)
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, fetchUserRole])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, metadata?: { fullName?: string, role?: string }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    supabaseUser,
    userProfile,
    loading,
    backendLoading,
    backendRetryCount,
    isAdmin,
    isSuperAdmin,
    userRole,
    organizationId,
    organization,
    signIn,
    signUp,
    signOut,
    refreshUserRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

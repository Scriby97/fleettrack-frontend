'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { authenticatedFetch } from '@/lib/api/authenticatedFetch'
import { saveProfile, getProfile } from '@/lib/offline/db';
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
  backendAvailable: boolean | null
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
  const pathname = usePathname()
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [backendLoading, setBackendLoading] = useState(false)
  const [backendRetryCount, setBackendRetryCount] = useState(0)
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const supabase = createClient()
  
  // Track number of active fetchUserRole calls
  const fetchingCountRef = useRef(0)

  // Compute derived values
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'
  const isSuperAdmin = userRole === 'super_admin'
  const organizationId = userProfile?.organizationId ?? null
  const organization = userProfile?.organization ?? null
  const isResetPasswordRoute = pathname?.startsWith('/reset-password') ?? false

  // Function to fetch user profile from backend
  const fetchUserRole = useCallback(async () => {
    console.log('[AUTH_PROVIDER] fetchUserRole aufgerufen (non-blocking)');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL

    // First: try to load cached profile immediately so UI can render fast
    try {
      const cached = await getProfile();
      if (cached) {
        setUserProfile(cached as any)
        console.log('[AUTH_PROVIDER] Verwende zwischengespeichertes Profil sofort (non-blocking)');
        // return cached role immediately but still perform background health check
        const cachedAny = cached as any
        let cachedRole: string | null = null
        if (cachedAny) {
          if (cachedAny.role) cachedRole = cachedAny.role
          else if (cachedAny.user_metadata && cachedAny.user_metadata.role) cachedRole = cachedAny.user_metadata.role
        }

        // Start background health-check + fetch but do not await it
        (async () => {
          try {
            setBackendLoading(true)
            setBackendRetryCount(0)
            console.log('[AUTH_PROVIDER] Hintergrund: Prüfe Backend-Verfügbarkeit...');
            const healthResult = await checkBackendHealth({
              retries: 3,
              retryDelay: 1000,
              useExponentialBackoff: false,
              onRetry: (attempt: number) => setBackendRetryCount(attempt)
            })
            setBackendAvailable(Boolean(healthResult.available))
            if (!healthResult.available) {
              console.warn('[AUTH_PROVIDER] Hintergrund: Backend weiterhin nicht erreichbar')
              return
            }
            // backend is available -> fetch authoritative profile
            const response = await authenticatedFetch(`${apiUrl}/auth/me`, { retries: 2, retryDelay: 1000, skipLoadingIndicator: true })
            if (!response.ok) return
            const profile: UserProfile = await response.json()
            setUserProfile(profile)
            try { await saveProfile(profile) } catch(e){ console.warn('Fehler beim Speichern des Profils', e) }
            setBackendAvailable(true)
          } catch (err) {
            console.warn('[AUTH_PROVIDER] Hintergrund-Fehler beim Health-Check:', err)
            setBackendAvailable(false)
          } finally {
            setBackendLoading(false)
            setBackendRetryCount(0)
          }
        })()

        return cachedRole
      }
    } catch (cacheErr) {
      console.warn('[AUTH_PROVIDER] Error reading cached profile', cacheErr)
    }

    // If no cache, still run background health-check and fetch, but return null immediately
    (async () => {
      try {
        setBackendLoading(true)
        setBackendRetryCount(0)
        const healthResult = await checkBackendHealth({
          retries: 3,
          retryDelay: 1000,
          useExponentialBackoff: false,
          onRetry: (attempt: number) => setBackendRetryCount(attempt)
        })
        setBackendAvailable(Boolean(healthResult.available))
        if (!healthResult.available) {
          console.warn('[AUTH_PROVIDER] Hintergrund: Backend nicht erreichbar')
          return
        }
        const response = await authenticatedFetch(`${apiUrl}/auth/me`, { retries: 2, retryDelay: 1000, skipLoadingIndicator: true })
        if (!response.ok) return
        const profile: UserProfile = await response.json()
        setUserProfile(profile)
        try { await saveProfile(profile) } catch(e){ console.warn('Fehler beim Speichern des Profils', e) }
        setBackendAvailable(true)
      } catch (err) {
        console.warn('[AUTH_PROVIDER] Hintergrund-Fehler beim Health-Check:', err)
        setBackendAvailable(false)
      } finally {
        setBackendLoading(false)
        setBackendRetryCount(0)
      }
    })()

    return null
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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When returning to the tab, refresh role/profile in background
        // do not reload the page — prefer a non-blocking refresh
        refreshUserRole().catch(() => {});
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    let initAuthCompleted = false
    
    // Check active sessions and sets the user
    const initAuth = async () => {
      console.log('[AUTH_PROVIDER] initAuth gestartet');
      const { data: { session } } = await supabase.auth.getSession()
      setSupabaseUser(session?.user ?? null)
      
      if (session?.user) {
        if (isResetPasswordRoute) {
          console.log('[AUTH_PROVIDER] Reset password route aktiv, überspringe Rollen-Fetch');
          setLoading(false)
          initAuthCompleted = true
          return
        }
        // Immediate fallback to metadata for fast UI
        setUserRole(session.user.user_metadata?.role ?? null)
        // Fetch authoritative role/profile in background (non-blocking)
        fetchUserRole().then((role) => {
          if (role) setUserRole(role)
        }).catch(() => {});
        // Wait a tick to ensure userProfile state has been updated
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      
      console.log('[AUTH_PROVIDER] initAuth abgeschlossen, setze loading=false');
      setLoading(false)
      initAuthCompleted = true
    }

    initAuth()

    // Listen for changes on auth state (login, logout, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH_PROVIDER] onAuthStateChange Event:', event, 'User:', session?.user?.email, 'initAuthCompleted:', initAuthCompleted);
      
      // Skip ALL events during initial load - initAuth handles it
      if (!initAuthCompleted) {
        console.log('[AUTH_PROVIDER] initAuth noch nicht fertig, überspringe Event:', event);
        return
      }
      
      setSupabaseUser(session?.user ?? null)
      
      if (session?.user) {
        if (isResetPasswordRoute) {
          console.log('[AUTH_PROVIDER] Reset password route aktiv, überspringe Rollen-Fetch');
          setLoading(false)
          return
        }
        // Use metadata immediately and refresh role/profile in background
        setLoading(true)
        setUserRole(session.user.user_metadata?.role ?? null)
        fetchUserRole().then((role) => {
          if (role) {
            console.log('[AUTH_PROVIDER] Setze userRole auf:', role);
            setUserRole(role)
          }
        }).finally(() => setLoading(false))
        // Wait a tick to ensure userProfile state has been updated
        await new Promise(resolve => setTimeout(resolve, 0))
      } else {
        console.log('[AUTH_PROVIDER] Keine Session, setze userRole auf null');
        setUserRole(null)
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      subscription.unsubscribe()
    }
  }, [supabase.auth, fetchUserRole, isResetPasswordRoute])

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
    backendAvailable,
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

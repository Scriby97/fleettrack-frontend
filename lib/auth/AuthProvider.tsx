'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { authenticatedFetch } from '@/lib/api/authenticatedFetch'
import { checkBackendHealth } from '@/lib/api/healthCheck'
import type { User, Organization } from '@/lib/types/user'

interface AuthContextType {
  supabaseUser: SupabaseUser | null
  userProfile: User | null
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
  const pathname = usePathname()
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [backendLoading, setBackendLoading] = useState(false)
  const [backendRetryCount, setBackendRetryCount] = useState(0)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Stable supabase client – created once per mount
  const supabase = useMemo(() => createClient(), [])

  // Track number of active fetchUserRole calls
  const fetchingCountRef = useRef(0)
  // Flag to avoid processing onAuthStateChange events before initAuth completes
  const initAuthCompletedRef = useRef(false)

  // Compute derived values
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'
  const isSuperAdmin = userRole === 'super_admin'
  const organizationId = userProfile?.organizationId ?? null
  const organization = userProfile?.organization ?? null
  const isResetPasswordRoute = pathname?.startsWith('/reset-password') ?? false

  // Function to fetch user profile from backend
  const fetchUserRole = useCallback(async () => {
    // Increment counter
    fetchingCountRef.current++

    // Deduplicate concurrent calls
    if (fetchingCountRef.current > 1) {
      fetchingCountRef.current--
      return null
    }

    setBackendRetryCount(0)
    setBackendLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (!apiUrl) {
        console.warn('NEXT_PUBLIC_API_URL nicht konfiguriert')
        fetchingCountRef.current--
        if (fetchingCountRef.current === 0) setBackendLoading(false)
        return null
      }

      // First, check if backend is available using lightweight health check
      const healthResult = await checkBackendHealth({
        retries: 8,
        retryDelay: 2000,
        useExponentialBackoff: true,
        onRetry: (attempt: number) => {
          setBackendRetryCount(attempt)
        }
      })

      if (!healthResult.available) {
        fetchingCountRef.current--
        if (fetchingCountRef.current === 0) {
          setBackendLoading(false)
          setBackendRetryCount(0)
        }
        return null
      }

      // Backend is available, now fetch actual user data
      const response = await authenticatedFetch(`${apiUrl}/auth/me`, {
        retries: 2,
        retryDelay: 1000,
        skipLoadingIndicator: true,
      })

      if (!response.ok) {
        console.error('Fehler beim Abrufen des Benutzerprofils:', response.status)
        fetchingCountRef.current--
        if (fetchingCountRef.current === 0) {
          setBackendLoading(false)
          setBackendRetryCount(0)
        }
        return null
      }

      const profile: User = await response.json()
      setUserProfile(profile)

      fetchingCountRef.current--
      if (fetchingCountRef.current === 0) {
        setBackendLoading(false)
        setBackendRetryCount(0)
      }

      return profile.role
    } catch (error) {
      console.error('Fehler beim Abrufen des Benutzerprofils:', error)
      fetchingCountRef.current--
      if (fetchingCountRef.current === 0) {
        setBackendLoading(false)
        setBackendRetryCount(0)
      }
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
    // Only reload when the session has actually expired during a background stay
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data } = await supabase.auth.getSession()
        if (!data.session && supabaseUser) {
          // Session expired while the tab was in the background – reload to clear state
          window.location.reload()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Check active sessions and set the user
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSupabaseUser(session?.user ?? null)

      if (session?.user) {
        if (isResetPasswordRoute) {
          setLoading(false)
          initAuthCompletedRef.current = true
          return
        }
        // Get role from backend, fall back to Supabase metadata on failure
        const roleFromBackend = await fetchUserRole()
        setUserRole(roleFromBackend ?? (session.user.user_metadata?.role ?? null))
        // Allow a microtask tick so userProfile state propagates before we clear loading
        await new Promise(resolve => setTimeout(resolve, 0))
      }

      setLoading(false)
      initAuthCompletedRef.current = true
    }

    initAuth()

    // Listen for changes on auth state (login, logout, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip ALL events during initial load – initAuth handles them
      if (!initAuthCompletedRef.current) return

      setSupabaseUser(session?.user ?? null)

      if (session?.user) {
        if (isResetPasswordRoute) {
          setLoading(false)
          return
        }
        setLoading(true)

        // Get role from backend, fall back to metadata on failure (never force-reload)
        const roleFromBackend = await fetchUserRole()
        setUserRole(roleFromBackend ?? (session.user.user_metadata?.role ?? null))
        setLoading(false)

        await new Promise(resolve => setTimeout(resolve, 0))
      } else {
        setUserRole(null)
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserRole, isResetPasswordRoute, supabaseUser])

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

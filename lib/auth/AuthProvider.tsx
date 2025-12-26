'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { authenticatedFetch } from '@/lib/api/authenticatedFetch'

interface UserProfile {
  id: string
  email: string
  role: string
  name?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  userRole: string | null
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, metadata?: { fullName?: string, role?: string }) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshUserRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const supabase = createClient()

  // Berechne isAdmin basierend auf der Benutzerrolle
  const isAdmin = userRole === 'admin'

  // Funktion zum Abrufen der User-Rolle vom Backend
  const fetchUserRole = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (!apiUrl) {
        console.warn('NEXT_PUBLIC_API_URL nicht konfiguriert')
        return null
      }

      const response = await authenticatedFetch(`${apiUrl}/auth/me`)
      if (!response.ok) {
        console.error('Fehler beim Abrufen der User-Rolle:', response.status)
        return null
      }

      const profile: UserProfile = await response.json()
      return profile.role
    } catch (error) {
      console.error('Fehler beim Abrufen der User-Rolle:', error)
      return null
    }
  }, [])

  // Funktion zum Aktualisieren der User-Rolle
  const refreshUserRole = useCallback(async () => {
    if (!user) {
      setUserRole(null)
      return
    }

    const roleFromBackend = await fetchUserRole()
    if (roleFromBackend) {
      setUserRole(roleFromBackend)
    } else {
      // Fallback auf metadata wenn Backend nicht verfügbar
      setUserRole(user.user_metadata?.role ?? null)
    }
  }, [user, fetchUserRole])

  useEffect(() => {
    // Check active sessions and sets the user
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Hole Rolle vom Backend
        const roleFromBackend = await fetchUserRole()
        if (roleFromBackend) {
          setUserRole(roleFromBackend)
        } else {
          // Fallback auf metadata
          setUserRole(session.user.user_metadata?.role ?? null)
        }
      }
      
      setLoading(false)
    }

    initAuth()

    // Listen for changes on auth state (login, logout, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Hole Rolle vom Backend
        const roleFromBackend = await fetchUserRole()
        if (roleFromBackend) {
          setUserRole(roleFromBackend)
        } else {
          // Fallback auf metadata
          setUserRole(session.user.user_metadata?.role ?? null)
        }
      } else {
        setUserRole(null)
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
    user,
    loading,
    isAdmin,
    userRole,
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

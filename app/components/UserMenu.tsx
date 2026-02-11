'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import type { FC } from 'react'

const UserMenu: FC = () => {
  const { supabaseUser, userProfile, signOut, isAdmin, isSuperAdmin, userRole, organization } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  if (!supabaseUser) return null

  const displayName = userProfile?.firstName && userProfile?.lastName
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : userProfile?.name || supabaseUser.user_metadata?.fullName || supabaseUser.email

  const getRoleDisplay = () => {
    if (isSuperAdmin) return '⭐ Super Admin'
    if (isAdmin) return '👑 Administrator'
    return '👤 Benutzer'
  }

  return (
    <div className="space-y-3">
      {/* Organization Info */}
      {organization && (
        <div className="pb-3 border-b border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Organization
          </div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-50">
            {organization.name}
          </div>
        </div>
      )}

      {/* User Info */}
      <div className="text-sm">
        <div className="font-medium text-zinc-900 dark:text-zinc-50">
          {displayName}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {supabaseUser.email}
        </div>
        {userRole && (
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
            {getRoleDisplay()}
          </div>
        )}
      </div>

      {/* Admin Links */}
      <button
        onClick={() => router.push('/settings')}
        className="w-full px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg transition-colors text-left"
      >
        ⚙️ Einstellungen
      </button>

      {isSuperAdmin && (
        <>
          <button
            onClick={() => router.push('/super-admin/users')}
            className="w-full px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-100 rounded-lg transition-colors text-left"
          >
            👥 Super Admin Users
          </button>
          <button
            onClick={() => router.push('/admin/organizations')}
            className="w-full px-4 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-100 rounded-lg transition-colors text-left"
          >
            🏢 Organizations
          </button>
        </>
      )}
      
      {isAdmin && !isSuperAdmin && (
        <button
          onClick={() => router.push('/admin/users')}
          className="w-full px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-100 rounded-lg transition-colors text-left"
        >
          👥 User Management
        </button>
      )}

      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="w-full px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 rounded-lg transition-colors"
      >
        Abmelden
      </button>
    </div>
  )
}

export default UserMenu

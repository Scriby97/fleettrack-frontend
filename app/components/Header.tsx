'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import Link from 'next/link'

export default function Header() {
  const { organization, userProfile, userRole, isSuperAdmin, isAdmin } = useAuth()

  const getRoleBadge = () => {
    if (isSuperAdmin) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
          Super Admin
        </span>
      )
    }
    if (isAdmin) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          Admin
        </span>
      )
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300">
        User
      </span>
    )
  }

  const displayName = userProfile?.firstName && userProfile?.lastName
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : userProfile?.name

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0b0b0b] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-zinc-50 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            FleetTrack
          </Link>
          
          {organization && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-400 dark:text-zinc-600">|</span>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{organization.name}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {displayName && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{displayName}</span>
              {userRole && getRoleBadge()}
            </div>
          )}
          
          {isAdmin && (
            <Link
              href="/admin/users"
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              User Management
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

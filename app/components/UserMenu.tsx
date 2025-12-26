'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import type { FC } from 'react'

const UserMenu: FC = () => {
  const { user, signOut, isAdmin, userRole } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  if (!user) return null

  return (
    <div className="space-y-2">
      <div className="text-sm">
        <div className="font-medium text-zinc-900 dark:text-zinc-50">
          {user.user_metadata?.fullName || user.email}
        </div>
        {userRole && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {isAdmin ? '👑 Administrator' : '👤 Benutzer'}
          </div>
        )}
      </div>
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

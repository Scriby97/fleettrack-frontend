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
    <div className="flex items-center gap-3 md:flex-col md:items-stretch">
      <div className="flex-1 md:flex-none text-sm">
        <div className="font-medium text-[var(--foreground)] truncate">
          {user.user_metadata?.fullName || user.email?.split('@')[0]}
        </div>
        {userRole && (
          <div className="text-xs text-[var(--secondary)] mt-0.5 hidden md:block">
            {isAdmin ? 'Admin' : 'Benutzer'}
          </div>
        )}
      </div>
      <button
        onClick={handleSignOut}
        className="md:w-full px-4 py-2 text-sm hover:bg-[var(--hover)] text-[var(--foreground)] rounded-lg transition-colors"
      >
        Abmelden
      </button>
    </div>
  )
}

export default UserMenu

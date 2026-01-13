# Migration Guide: Auth-System Updates

## 🔄 Änderungen im AuthProvider

Der `AuthProvider` wurde erweitert, um Multi-Tenancy zu unterstützen. Hier ist, was sich geändert hat:

### Alte Auth-Context-Struktur
```typescript
const { 
  user,           // Supabase User
  loading,
  isAdmin,
  userRole,
  signIn,
  signUp,
  signOut,
  refreshUserRole
} = useAuth()
```

### Neue Auth-Context-Struktur
```typescript
const { 
  supabaseUser,    // ⚠️ Umbenannt von 'user'
  userProfile,     // ✨ NEU: Vollständiges User-Profil
  loading,
  isAdmin,         // ✅ Unverändert
  isSuperAdmin,    // ✨ NEU
  userRole,        // ✅ Unverändert
  organizationId,  // ✨ NEU
  organization,    // ✨ NEU
  signIn,          // ✅ Unverändert
  signUp,          // ✅ Unverändert
  signOut,         // ✅ Unverändert
  refreshUserRole  // ✅ Unverändert
} = useAuth()
```

## 📝 Migration-Checklist

### ✅ Keine Änderungen nötig

Wenn deine Komponente nur diese Properties verwendet, funktioniert alles weiterhin:
- `isAdmin`
- `userRole`
- `loading`
- `signIn()`, `signUp()`, `signOut()`

**Beispiel (funktioniert weiterhin):**
```typescript
const { isAdmin, loading } = useAuth()

if (loading) return <Loading />
if (!isAdmin) return <AccessDenied />
```

### ⚠️ Anpassungen erforderlich

Wenn deine Komponente `user` direkt verwendet:

**Alt:**
```typescript
const { user } = useAuth()
return <p>{user?.email}</p>
```

**Neu (Option 1 - Supabase User):**
```typescript
const { supabaseUser } = useAuth()
return <p>{supabaseUser?.email}</p>
```

**Neu (Option 2 - User Profile):**
```typescript
const { userProfile } = useAuth()
return <p>{userProfile?.email}</p>
```

## 🔍 Komponenten-Audit

### Komponenten die bereits kompatibel sind:

#### ✅ app/page.tsx
```typescript
const { isAdmin } = useAuth()
// ✅ Keine Änderungen nötig
```

#### ✅ app/components/usages.tsx
```typescript
const { isAdmin } = useAuth()
// ✅ Keine Änderungen nötig
```

#### ✅ app/components/UserMenu.tsx
```typescript
// ✅ Bereits aktualisiert
const { supabaseUser, userProfile, organization } = useAuth()
```

#### ✅ app/admin/users/page.tsx
```typescript
// ✅ Bereits aktualisiert
const { isAdmin, organizationId, organization } = useAuth()
```

### Komponenten die eventuell angepasst werden müssen:

#### app/login/page.tsx

**Aktueller Code:**
```typescript
const { signIn, signUp } = useAuth()
```

**Status:** ✅ Keine Änderungen nötig (signIn/signUp unverändert)

## 🎯 Best Practices

### User-Informationen anzeigen

**Empfohlen:**
```typescript
const { userProfile, supabaseUser } = useAuth()

const displayName = 
  userProfile?.firstName && userProfile?.lastName
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : supabaseUser?.user_metadata?.fullName || supabaseUser?.email
```

### Organization-Kontext verwenden

**Empfohlen:**
```typescript
const { organization, organizationId } = useAuth()

// Direkt verfügbar:
console.log(organization?.name)  // "Firma ABC"
console.log(organizationId)      // "org-123"
```

### Admin-Check

**Empfohlen:**
```typescript
const { isAdmin, isSuperAdmin } = useAuth()

// Admin oder Super-Admin
if (isAdmin) {
  // Zeige Admin-Features
}

// Nur Super-Admin
if (isSuperAdmin) {
  // Zeige Super-Admin-Features
}
```

## 🐛 Häufige Probleme

### Problem: `user` ist undefined

**Ursache:** Variable wurde von `user` zu `supabaseUser` umbenannt

**Lösung:**
```typescript
// Alt:
const { user } = useAuth()

// Neu:
const { supabaseUser } = useAuth()
```

### Problem: Organization-Daten fehlen

**Ursache:** Backend gibt noch keine Organization-Daten zurück

**Lösung:**
1. Stelle sicher, dass das Backend `/auth/me` Organization-Daten zurückgibt:
```json
{
  "organizationId": "...",
  "organization": {
    "id": "...",
    "name": "..."
  }
}
```

2. Verwende Fallback-Logik:
```typescript
const { organization } = useAuth()
if (!organization) {
  return <p>Loading organization...</p>
}
```

### Problem: isAdmin funktioniert nicht mehr

**Ursache:** Backend gibt falsche Rolle zurück

**Lösung:**
1. Prüfe `/auth/me` Response im Browser DevTools
2. Stelle sicher, dass `role` im Response enthalten ist
3. Prüfe Console-Logs des AuthProviders

**Debug-Code:**
```typescript
const { userRole, isAdmin, isSuperAdmin } = useAuth()
console.log({ userRole, isAdmin, isSuperAdmin })
```

## 🚀 Neue Features nutzen

### Organization-Name im Header anzeigen

```typescript
import { useAuth } from '@/lib/auth/AuthProvider'

export default function MyComponent() {
  const { organization } = useAuth()
  
  return (
    <header>
      <h1>{organization?.name || 'FleetTrack'}</h1>
    </header>
  )
}
```

### User-Rolle Badge anzeigen

```typescript
import { useAuth } from '@/lib/auth/AuthProvider'

export default function UserBadge() {
  const { userRole, isSuperAdmin, isAdmin } = useAuth()
  
  if (isSuperAdmin) return <Badge>Super Admin</Badge>
  if (isAdmin) return <Badge>Admin</Badge>
  return <Badge>User</Badge>
}
```

### Admin-Features schützen

```typescript
import { useAuth } from '@/lib/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminPage() {
  const { isAdmin, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/')
    }
  }, [loading, isAdmin, router])
  
  if (loading) return <Loading />
  if (!isAdmin) return null
  
  return <div>Admin Content</div>
}
```

## 📊 Compatibility Matrix

| Feature | Alt | Neu | Status |
|---------|-----|-----|--------|
| `user` | ✅ | ❌ | Umbenennen zu `supabaseUser` |
| `isAdmin` | ✅ | ✅ | Kompatibel |
| `userRole` | ✅ | ✅ | Kompatibel |
| `loading` | ✅ | ✅ | Kompatibel |
| `signIn()` | ✅ | ✅ | Kompatibel |
| `signUp()` | ✅ | ✅ | Kompatibel |
| `signOut()` | ✅ | ✅ | Kompatibel |
| `supabaseUser` | ❌ | ✅ | Neu |
| `userProfile` | ❌ | ✅ | Neu |
| `organization` | ❌ | ✅ | Neu |
| `organizationId` | ❌ | ✅ | Neu |
| `isSuperAdmin` | ❌ | ✅ | Neu |

## ✅ Verification

Nach der Migration, teste folgendes:

1. **Login funktioniert**
   - Normaler User kann sich einloggen
   - Admin kann sich einloggen

2. **User-Informationen werden angezeigt**
   - Name/Email im UserMenu
   - Organization-Name im Header

3. **Admin-Features sind geschützt**
   - Normale User sehen kein "User Management"
   - Admins sehen "User Management"

4. **Organization-Isolation funktioniert**
   - User sehen nur Daten ihrer Organization
   - API-Requests werden korrekt gefiltert

---

**Bei Fragen oder Problemen:** Siehe [MULTI_TENANCY_FRONTEND.md](./MULTI_TENANCY_FRONTEND.md)

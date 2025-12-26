# FleetTrack - Supabase Auth Integration

## Setup Anleitung

### 1. Supabase Projekt erstellen

1. Gehe zu [https://app.supabase.com](https://app.supabase.com)
2. Erstelle ein neues Projekt
3. Warte bis das Projekt fertig eingerichtet ist

### 2. Environment Variablen konfigurieren

1. Gehe zu deinem Supabase Projekt Dashboard
2. Navigiere zu **Settings** → **API**
3. Kopiere die **Project URL** und den **anon public** API Key
4. Füge diese in deine `.env.local` Datei ein:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
```

### 3. E-Mail Auth konfigurieren (Optional)

In Supabase Dashboard → **Authentication** → **Providers**:
- E-Mail Auth ist standardmäßig aktiviert
- Du kannst E-Mail-Bestätigungen ein-/ausschalten
- Für Entwicklung: Deaktiviere "Confirm email" für schnelleres Testing

### 4. App starten

```bash
npm run dev
```

Die App läuft auf `http://localhost:3000`

## Funktionen

### ✅ Implementiert

- **Login/Registrierung**: Vollständige Authentifizierung mit E-Mail und Passwort
- **Rollen-basierte Zugriffskontrolle**: Admin und User Rollen
- **Session Management**: Automatische Session-Verwaltung mit Cookies
- **Protected Routes**: Middleware schützt alle Routen außer `/login`
- **User Context**: React Context für globalen Auth-State
- **Auto-Redirect**: Nicht authentifizierte User werden zu `/login` weitergeleitet
- **User Menu**: Zeigt aktuellen User, Rolle und Logout-Button in der Sidebar

### 🔐 Rollen und Berechtigungen

**Admin-Rolle:**
- Zugriff auf Flottenübersicht
- Kann neue Fahrzeuge erfassen
- Vollständiger Zugriff auf alle Funktionen

**User-Rolle (Standard):**
- Nutzungen erfassen
- Übersicht der Nutzungen anzeigen
- Kein Zugriff auf Fahrzeugverwaltung

### 📁 Struktur

```
lib/
  auth/
    AuthProvider.tsx     # React Context für Auth-State
  supabase/
    client.ts           # Browser Supabase Client
    server.ts           # Server Supabase Client
    middleware.ts       # Session-Update und Protected Routes
middleware.ts           # Next.js Middleware (Auth-Check)
app/
  login/
    page.tsx            # Login/Registrierungs-Page
  components/
    UserMenu.tsx        # User-Menü mit Logout
```

## Verwendung

### Benutzer Registrierung

1. Gehe zu `/login`
2. Klicke auf "Noch kein Konto? Hier registrieren"
3. Fülle das Formular aus
4. **Wichtig**: Aktiviere "Als Administrator registrieren" für Admin-Rechte
5. Registriere dich

**Hinweis**: Die Rolle wird in den `user_metadata` gespeichert und kann nach der Registrierung nicht mehr geändert werden (außer über das Supabase Dashboard).

### Rollen prüfen und verwenden

```tsx
'use client'

import { useAuth } from '@/lib/auth/AuthProvider'

export default function MyComponent() {
  const { user, isAdmin, userRole } = useAuth()
  
  return (
    <div>
      {isAdmin && <AdminPanel />}
      {!isAdmin && <UserPanel />}
    </div>
  )
}
```

### Auth Hook verwenden

```tsx
'use client'

import { useAuth } from '@/lib/auth/AuthProvider'

export default function MyComponent() {
  const { user, signOut, loading } = useAuth()
  
  if (loading) return <div>Laden...</div>
  
  return (
    <div>
      <p>Eingeloggt als: {user?.email}</p>
      <button onClick={signOut}>Abmelden</button>
    </div>
  )
}
```

### Server-seitig User abrufen

```tsx
import { createClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  return <div>Hallo {user?.email}</div>
}
```

## Weitere Schritte

### Empfohlene Erweiterungen:

1. **Passwort zurücksetzen**: 
   - Komponente für "Passwort vergessen" erstellen
   - `supabase.auth.resetPasswordForEmail()` verwenden

2. **Profile Verwaltung**:
   - User-Profil-Seite erstellen
   - Zusätzliche User-Daten in `user_metadata` oder separater Tabelle speichern

3. **OAuth Provider**:
   - Google, GitHub, etc. in Supabase aktivieren
   - `supabase.auth.signInWithOAuth()` verwenden

4. **Row Level Security (RLS)**:
   - Datenbank-Tabellen mit RLS Policies schützen
   - User-spezifische Daten sichern

## Wichtige Hinweise

- **Environment Variablen**: Die `.env.local` Datei ist in `.gitignore` und wird nicht committed
- **Middleware**: Schützt automatisch alle Routen außer `/login`
- **Session Cookies**: Werden automatisch von Supabase verwaltet
- **Development**: Im Dev-Modus kannst du E-Mail-Bestätigung in Supabase deaktivieren

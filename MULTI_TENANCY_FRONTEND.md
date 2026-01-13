# Multi-Tenancy & Invite System - Frontend Implementation

## ✅ Implementierte Features

Das Frontend unterstützt jetzt vollständig das invite-basierte Multi-Tenancy-System:

### 1. 📧 Invite-Flow

#### Invite-Link-Seite (`/invite/:token`)
- **Route:** `/invite/[token]/page.tsx`
- **Öffentlich zugänglich** (kein Login erforderlich)
- Validiert den Invite-Token automatisch
- Zeigt Organization-Name, eingeladene Email und Rolle an
- Registrierungsformular für neue User

**Funktionalität:**
- Token-Validierung via `GET /invites/:token`
- User-Registrierung via `POST /invites/accept`
- Automatische Weiterleitung zum Login nach erfolgreicher Registrierung
- Error-Handling für ungültige/abgelaufene Invites

### 2. 👥 Admin-Bereich: User Management

#### User-Verwaltungs-Seite (`/admin/users`)
- **Zugriff:** Nur für Admins und Super-Admins
- **Features:**
  - Invite User Button mit Modal
  - Liste aller Invites mit Status (Pending/Accepted/Expired)
  - Copy-to-Clipboard für Invite-Links
  - Delete Invite Funktionalität
  - Status-Badges für visuelle Übersicht

**API-Integration:**
- `POST /organizations/invites` - Neuen Invite erstellen (organizationId automatisch)
- `GET /organizations/invites` - Alle Invites abrufen (organizationId automatisch)
- `DELETE /organizations/invites/:id` - Invite löschen

### 3. 🔐 Auth-System Erweiterungen

#### AuthProvider Updates
Der AuthProvider wurde erweitert um:
- `userProfile` - Vollständiges User-Profil mit Organization
- `organization` - Organization-Daten (id, name, subdomain)
- `organizationId` - Direkte Organization-ID
- `isSuperAdmin` - Flag für Super-Admin-Rechte
- `isAdmin` - Beinhaltet jetzt auch Super-Admins

**Neue Auth-Context-Struktur:**
```typescript
interface AuthContextType {
  supabaseUser: SupabaseUser | null
  userProfile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  userRole: string | null
  organizationId: string | null
  organization: Organization | null
  signIn: (email, password) => Promise<{ error }>
  signUp: (email, password, metadata?) => Promise<{ error }>
  signOut: () => Promise<void>
  refreshUserRole: () => Promise<void>
}
```

### 4. 🏢 Organization-Context

#### Types (`lib/types/user.ts`)
Neue TypeScript-Interfaces:
- `Organization` - Organization-Daten
- `User` - Erweitertes User-Model mit Organization
- `InviteInfo` - Invite-Informationen
- `InviteEntity` - Vollständiges Invite-Objekt

#### API Client (`lib/api/invites.ts`)
Zentrale API-Funktionen für Invite-Management:
- `getInviteByToken(token)` - Öffentlich, keine Auth
- `acceptInvite(data)` - Öffentlich, keine Auth
- `createInvite(data)` - Authentifiziert (organizationId automatisch)
- `getOrganizationInvites()` - Authentifiziert (organizationId automatisch)
- `deleteInvite(inviteId)` - Authentifiziert

### 5. 🎨 UI-Komponenten

#### Header Component (`app/components/Header.tsx`)
- Zeigt Organization-Name an
- User-Name und Rolle Badge
- Direkter Link zum User Management (nur für Admins)
- Responsive Design

#### UserMenu Updates
- Zeigt Organization-Name
- Verbesserte Rollenanzeige (Super Admin, Admin, User)
- Direkter Link zum User Management
- Zeigt Vor- und Nachname wenn verfügbar

### 6. 🛡️ Middleware-Anpassungen

#### Route-Protection
Die Middleware wurde angepasst um:
- `/invite/*` Routes als öffentlich zu markieren
- Alle anderen Routes bleiben geschützt
- Login-Redirect bleibt aktiv

**Öffentliche Routes:**
- `/login`
- `/auth/*`
- `/invite/*` ✨ NEU

## 📁 Dateistruktur

```
app/
├── invite/
│   └── [token]/
│       └── page.tsx          # Invite-Akzeptierungs-Seite
├── admin/
│   └── users/
│       └── page.tsx          # User Management Dashboard
├── components/
│   ├── Header.tsx            # Neuer Header mit Org-Info
│   └── UserMenu.tsx          # Aktualisiert mit Org-Info
lib/
├── types/
│   └── user.ts               # Type-Definitionen
├── api/
│   ├── invites.ts            # Invite-API-Client
│   └── authenticatedFetch.ts # (unverändert)
├── auth/
│   └── AuthProvider.tsx      # Erweitert mit Organization
└── supabase/
    └── middleware.ts         # Aktualisiert für Invite-Routes
```

## 🚀 Verwendung

### Als Admin: User einladen

1. Navigiere zu **User Management** (Link im Header oder UserMenu)
2. Klicke auf **"Invite User"**
3. Gib Email und Rolle (User/Admin) ein
4. Klicke auf **"Create Invite"**
5. Der Invite-Link wird automatisch in die Zwischenablage kopiert
6. Teile den Link mit dem neuen User

### Als neuer User: Invite akzeptieren

1. Öffne den erhaltenen Invite-Link: `https://your-app.com/invite/{token}`
2. Prüfe die angezeigten Informationen (Organization, Email, Rolle)
3. Fülle das Registrierungsformular aus:
   - First Name
   - Last Name
   - Password (min. 6 Zeichen)
   - Confirm Password
4. Klicke auf **"Accept Invite & Create Account"**
5. Nach erfolgreicher Registrierung: Login auf der Login-Seite

## 🔧 Konfiguration

### Environment Variables

Stelle sicher, dass folgende Environment-Variablen gesetzt sind:

```env
# In .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001  # Deine Backend-URL
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Backend-Anforderungen

Das Backend muss folgende Endpoints bereitstellen:

#### Öffentliche Endpoints (keine Auth)
- `GET /invites/:token` - Invite-Info abrufen
- `POST /invites/accept` - Invite akzeptieren

#### Authentifizierte Endpoints
- `GET /auth/me` - User-Profil mit Organization
- `POST /organizations/invites` - Invite erstellen (organizationId automatisch)
- `GET /organizations/invites` - Invites auflisten (organizationId automatisch)
- `DELETE /organizations/invites/:id` - Invite löschen

### Backend Response-Formate

#### GET /auth/me
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "role": "admin",
  "organizationId": "org-id",
  "organization": {
    "id": "org-id",
    "name": "Firma ABC"
  },
  "firstName": "John",
  "lastName": "Doe"
}
```

#### GET /invites/:token
```json
{
  "email": "newuser@example.com",
  "role": "user",
  "organization": {
    "id": "org-id",
    "name": "Firma ABC"
  },
  "expiresAt": "2026-02-07T12:00:00Z"
}
```

## ✨ Features im Detail

### Automatisches Data-Filtering

Alle existierenden API-Requests werden automatisch vom Backend gefiltert:
- ✅ `GET /vehicles` - Nur Vehicles der eigenen Organization
- ✅ `GET /vehicles/stats` - Nur Stats der eigenen Organization
- ✅ `GET /auth/users` - Nur Users der eigenen Organization

**Keine Änderungen im Frontend-Code nötig!**

### Role-Based Access Control

- **User**: Kann eigene Daten sehen und bearbeiten
- **Admin**: Kann User einladen, Invites verwalten
- **Super Admin**: Zusätzliche Rechte (für zukünftige Features)

### Security Features

- ✅ Invite-Token haben ein Ablaufdatum
- ✅ Invites können nur einmal verwendet werden
- ✅ Email-Validierung im Invite-Prozess
- ✅ Passwort-Mindestlänge (6 Zeichen)
- ✅ Geschützte Admin-Routes
- ✅ Automatische Session-Verwaltung

## 🧪 Testing

### Test-Szenarien

1. **Invite erstellen (Admin)**
   - Als Admin einloggen
   - User Management öffnen
   - Neuen Invite erstellen
   - Link kopieren

2. **Invite akzeptieren (Neuer User)**
   - Invite-Link öffnen
   - Daten validieren
   - Account erstellen
   - Login testen

3. **Expired Invite**
   - Abgelaufenen Invite-Link öffnen
   - Fehlermeldung sollte angezeigt werden

4. **Invalid Invite**
   - Ungültigen Token verwenden
   - Fehlermeldung sollte angezeigt werden

5. **Organization-Isolation**
   - Als User einloggen
   - Nur Daten der eigenen Organization sollten sichtbar sein

## 🐛 Troubleshooting

### "No active session" Fehler
- Browser-Cache leeren
- Neu einloggen
- Supabase-Konfiguration prüfen

### "Failed to fetch invite" Fehler
- Backend-URL in `.env.local` prüfen
- Backend muss laufen
- Token im URL prüfen

### "Invite link copied" wird nicht angezeigt
- Browser-Berechtigungen für Clipboard prüfen
- Über HTTPS/localhost aufrufen

### Admin-Seite nicht sichtbar
- User-Rolle im Backend prüfen
- `/auth/me` Endpoint testen
- Browser-Console für Fehler prüfen

## 📝 Nächste Schritte (Optional)

### Phase 1: Email-Integration
- [ ] Email-Service konfigurieren (SendGrid, Resend, AWS SES)
- [ ] Email-Templates erstellen
- [ ] Automatischer Email-Versand bei Invite-Erstellung

### Phase 2: Super-Admin Features
- [ ] Organization-Verwaltungsseite (`/super-admin/organizations`)
- [ ] Organizations erstellen/bearbeiten/löschen
- [ ] Organization-Statistiken

### Phase 3: Onboarding
- [ ] Onboarding-Flow nach Invite-Akzeptierung
- [ ] Welcome-Tour durch die App
- [ ] Initial-Setup-Wizard

### Phase 4: Advanced Features
- [ ] Bulk-Invite-Upload (CSV)
- [ ] Invite-Templates
- [ ] Custom-Rollen mit Permissions
- [ ] Audit-Log für Admin-Aktionen

## 📚 Weiterführende Dokumentation

- [Supabase Auth Dokumentation](./SUPABASE_AUTH.md)
- [Backend API Dokumentation](../backend/README.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

**Status:** ✅ Vollständig implementiert und einsatzbereit

**Letzte Aktualisierung:** Januar 2026

# Quick Start: Multi-Tenancy Testing

## 🚀 Setup (einmalig)

1. **Backend starten**
```bash
cd ../backend
npm run start:dev
```

2. **Frontend starten**
```bash
npm run dev
```

3. **Environment-Variablen prüfen**
```bash
# .env.local sollte enthalten:
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

## 🧪 Test-Workflow

### Schritt 1: Als Admin einloggen

1. Öffne: http://localhost:3000/login
2. Login mit Admin-Account:
   - Email: admin@example.com
   - Password: ********

**Erwartetes Ergebnis:**
- ✅ Redirect zu `/`
- ✅ Organization-Name im Header sichtbar
- ✅ "Admin" Badge sichtbar
- ✅ "User Management" Button im Header

### Schritt 2: User einladen

1. Klicke auf **"User Management"** im Header
2. Klicke auf **"Invite User"**
3. Gib Email ein: `newuser@test.com`
4. Wähle Rolle: **User**
5. Klicke auf **"Create Invite"**

**Erwartetes Ergebnis:**
- ✅ Modal schließt sich
- ✅ "Invite link copied!" Meldung erscheint
- ✅ Neuer Invite in der Tabelle sichtbar
- ✅ Status: "Pending"
- ✅ Invite-Link in Zwischenablage

### Schritt 3: Invite-Link testen

1. **Option A:** Öffne Invite-Link aus Zwischenablage
2. **Option B:** Klicke auf "Copy Link" Button in der Tabelle

URL Format: `http://localhost:3000/invite/abc123xyz...`

**Erwartetes Ergebnis:**
- ✅ Invite-Seite lädt
- ✅ Organization-Name angezeigt
- ✅ Email vorausgefüllt (readonly)
- ✅ Rolle angezeigt
- ✅ Ablaufdatum angezeigt

### Schritt 4: Invite akzeptieren

1. Fülle das Formular aus:
   - **First Name:** Max
   - **Last Name:** Mustermann
   - **Password:** test123
   - **Confirm Password:** test123
2. Klicke auf **"Accept Invite & Create Account"**

**Erwartetes Ergebnis:**
- ✅ Account wird erstellt
- ✅ Redirect zu `/login` mit Success-Message
- ✅ Kann sich mit neuer Email/Password einloggen

### Schritt 5: Als neuer User einloggen

1. Login mit:
   - Email: newuser@test.com
   - Password: test123

**Erwartetes Ergebnis:**
- ✅ Login erfolgreich
- ✅ Organization-Name sichtbar
- ✅ "User" Badge sichtbar
- ✅ KEIN "User Management" Button (nur für Admins)

### Schritt 6: Organization-Isolation testen

1. Als neuer User:
   - Navigiere zu Vehicles
   - Erstelle ein neues Vehicle

2. Als Admin (andere Organization):
   - Login mit anderem Admin-Account
   - Prüfe Vehicles-Liste

**Erwartetes Ergebnis:**
- ✅ Jede Organization sieht nur ihre eigenen Vehicles
- ✅ Keine Cross-Organization-Daten sichtbar

## 🐛 Troubleshooting

### Problem: "No active session" beim Invite-Erstellen

**Lösung:**
```bash
# 1. Logout und erneut einloggen
# 2. Browser-Cache leeren
# 3. DevTools Console prüfen auf Fehler
```

### Problem: Invite-Link führt zu 404

**Lösung:**
```bash
# Prüfe ob Middleware richtig konfiguriert ist:
grep -r "invite" middleware.ts

# Sollte enthalten:
!request.nextUrl.pathname.startsWith('/invite')
```

### Problem: Backend-Fehler beim Invite-Erstellen

**Lösung:**
```bash
# Backend-Logs prüfen:
cd ../backend
npm run start:dev

# API-Endpoint testen:
curl -X POST http://localhost:3001/organizations/{orgId}/invites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","role":"user"}'
```

### Problem: Organization-Name wird nicht angezeigt

**Lösung:**
```typescript
// In Browser DevTools Console:
const { userProfile } = useAuth()
console.log(userProfile)

// Sollte enthalten:
{
  organizationId: "...",
  organization: {
    id: "...",
    name: "..."
  }
}
```

## ✅ Checkliste: Alle Features testen

- [ ] Admin kann sich einloggen
- [ ] Admin sieht Organization-Name
- [ ] Admin sieht "Admin" Badge
- [ ] Admin kann User Management öffnen
- [ ] Admin kann Invite erstellen
- [ ] Invite-Link wird kopiert
- [ ] Invite erscheint in Liste mit Status "Pending"
- [ ] Invite-Link kann geöffnet werden (ohne Login)
- [ ] Invite-Seite zeigt korrekte Daten
- [ ] Neuer User kann Account erstellen
- [ ] Neuer User wird zur Login-Seite weitergeleitet
- [ ] Neuer User kann sich einloggen
- [ ] Neuer User sieht Organization-Name
- [ ] Neuer User sieht "User" Badge
- [ ] Neuer User sieht KEIN User Management
- [ ] Organization-Isolation funktioniert
- [ ] Invite-Status ändert sich zu "Accepted"
- [ ] Expired Invites zeigen "Expired" Status
- [ ] Ungültige Invite-Links zeigen Fehler

## 📊 Test-Matrix

| Rolle | Feature | Zugriff |
|-------|---------|---------|
| Admin | User Management | ✅ |
| Admin | Invite erstellen | ✅ |
| Admin | Invites anzeigen | ✅ |
| Admin | Invite löschen | ✅ |
| User | User Management | ❌ |
| User | Eigene Daten | ✅ |
| Anonymous | Invite-Link | ✅ |
| Anonymous | Login | ✅ |
| Anonymous | Dashboard | ❌ |

## 🔍 Debug-Commands

### Browser DevTools Console

```javascript
// Auth-Kontext prüfen
const auth = useAuth()
console.log({
  supabaseUser: auth.supabaseUser,
  userProfile: auth.userProfile,
  organization: auth.organization,
  isAdmin: auth.isAdmin,
  isSuperAdmin: auth.isSuperAdmin
})

// API-Request testen
fetch('http://localhost:3001/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('supabase.auth.token')
  }
})
  .then(r => r.json())
  .then(console.log)
```

### Backend API testen

```bash
# Get current user profile
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get invites
curl http://localhost:3001/organizations/invites \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get invite by token (public)
curl http://localhost:3001/invites/{token}

# Create invite
curl -X POST http://localhost:3001/organizations/invites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","role":"user"}'
```

## 📝 Test-Daten

### Test-Accounts

```
Admin Account:
Email: admin@example.com
Password: admin123
Organization: Firma ABC

User Account:
Email: user@example.com  
Password: user123
Organization: Firma ABC
```

### Test-Invites

```
Test-Email: newuser1@test.com
Test-Email: newuser2@test.com
Test-Email: admin2@test.com (Rolle: Admin)
```

---

**Happy Testing! 🎉**

Bei Problemen: Siehe [MULTI_TENANCY_FRONTEND.md](./MULTI_TENANCY_FRONTEND.md) oder [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

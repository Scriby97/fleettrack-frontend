# 🚀 Deployment Checklist: Multi-Tenancy System

## ✅ Pre-Deployment Checklist

### 1. Environment-Variablen

#### Development (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

#### Production (.env.production)
```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

**Checklist:**
- [ ] `NEXT_PUBLIC_API_URL` auf Production-Backend gesetzt
- [ ] `NEXT_PUBLIC_SUPABASE_URL` korrekt
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` korrekt
- [ ] Keine Secrets im Git-Repository

### 2. Backend-Anforderungen

**Endpoints müssen verfügbar sein:**
- [ ] `GET /invites/:token` (öffentlich)
- [ ] `POST /invites/accept` (öffentlich)
- [ ] `GET /auth/me` (authentifiziert)
- [ ] `POST /organizations/invites` (authentifiziert, Admin)
- [ ] `GET /organizations/invites` (authentifiziert, Admin)
- [ ] `DELETE /organizations/invites/:id` (authentifiziert, Admin)

**Response-Format von `/auth/me` muss enthalten:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "role": "admin",
  "organizationId": "org-id",
  "organization": {
    "id": "org-id",
    "name": "Organization Name"
  },
  "firstName": "John",
  "lastName": "Doe"
}
```

### 3. Database Schema

**Tabellen müssen existieren:**
- [ ] `organizations` (id, name, subdomain)
- [ ] `users` (id, email, role, organizationId, firstName, lastName)
- [ ] `invites` (id, token, email, role, status, organizationId, expiresAt)
- [ ] `vehicles` (id, ..., organizationId)
- [ ] `usages` (id, ..., vehicleId)

**Foreign Keys:**
- [ ] `users.organizationId` → `organizations.id`
- [ ] `invites.organizationId` → `organizations.id`
- [ ] `vehicles.organizationId` → `organizations.id`

### 4. Supabase-Konfiguration

**Auth-Einstellungen:**
- [ ] Email-Authentifizierung aktiviert
- [ ] Email-Bestätigung konfiguriert (optional)
- [ ] Redirect-URLs konfiguriert
- [ ] JWT-Expiration sinnvoll gesetzt

**Row Level Security (RLS):**
- [ ] Policies für organization-basierte Isolation (optional)
- [ ] Policies für user-basierte Zugriffe

### 5. Frontend-Build

**Build-Test:**
```bash
npm run build
```

**Checklist:**
- [ ] Build läuft ohne Fehler durch
- [ ] Keine TypeScript-Errors
- [ ] Keine ESLint-Warnings (kritisch)
- [ ] Bundle-Size akzeptabel

### 6. Middleware-Konfiguration

**Prüfe [middleware.ts](./middleware.ts):**
- [ ] `/invite/*` ist als öffentlich markiert
- [ ] `/login` ist als öffentlich markiert
- [ ] Alle anderen Routes sind geschützt

**Test:**
```bash
# Als nicht-eingeloggter User:
# ✅ /login erreichbar
# ✅ /invite/abc123 erreichbar
# ❌ / → redirect zu /login
# ❌ /admin/users → redirect zu /login
```

### 7. CORS-Konfiguration (Backend)

**Backend muss CORS erlauben:**
```typescript
// NestJS: main.ts
app.enableCors({
  origin: [
    'http://localhost:3000',        // Development
    'https://your-domain.com',      // Production
  ],
  credentials: true,
})
```

### 8. Security-Checks

- [ ] Keine Secrets im Frontend-Code
- [ ] Keine API-Keys im Client
- [ ] Supabase Anon Key ist für öffentliche Verwendung gedacht
- [ ] JWT-Tokens werden sicher gespeichert (httpOnly Cookies via Supabase)
- [ ] HTTPS in Production aktiviert

### 9. Performance-Optimierung

- [ ] Next.js Image-Optimization konfiguriert
- [ ] Static-Assets werden gecacht
- [ ] API-Requests werden dedupliziert (React Query optional)
- [ ] Loading-States überall vorhanden

### 10. Error-Handling

**Prüfe Error-States in:**
- [ ] `/invite/[token]` → Ungültiger/abgelaufener Token
- [ ] `/admin/users` → Nicht-Admin-Zugriff
- [ ] `AuthProvider` → Backend nicht erreichbar
- [ ] `invites.ts` API-Client → Network-Fehler

### 11. Testing

**Manueller Test-Workflow:**
- [ ] Admin kann sich einloggen
- [ ] Admin sieht Organization-Name
- [ ] Admin kann User Management öffnen
- [ ] Admin kann Invite erstellen
- [ ] Invite-Link wird kopiert
- [ ] Invite-Link funktioniert (ohne Login)
- [ ] Neuer User kann Account erstellen
- [ ] Neuer User wird zu Login weitergeleitet
- [ ] Neuer User kann sich einloggen
- [ ] Neuer User sieht nur Daten seiner Organization
- [ ] Normaler User sieht kein User Management

**Automated Tests (optional):**
```bash
npm run test        # Unit Tests
npm run test:e2e    # E2E Tests (Cypress/Playwright)
```

### 12. Documentation

**Dokumentation vollständig:**
- [ ] [MULTI_TENANCY_FRONTEND.md](./MULTI_TENANCY_FRONTEND.md)
- [ ] [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- [ ] [TESTING.md](./TESTING.md)
- [ ] [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ ] README.md aktualisiert

### 13. Monitoring & Logging

**Optional aber empfohlen:**
- [ ] Error-Tracking (Sentry, LogRocket)
- [ ] Analytics (Plausible, Google Analytics)
- [ ] Performance-Monitoring (Vercel Analytics)
- [ ] Uptime-Monitoring (UptimeRobot)

## 🌐 Deployment-Platforms

### Vercel (empfohlen für Next.js)

**Setup:**
1. Repository mit Vercel verbinden
2. Environment-Variablen setzen
3. Build-Command: `npm run build`
4. Output-Directory: `.next`

**Checklist:**
- [ ] Environment-Variablen in Vercel-Dashboard gesetzt
- [ ] Custom-Domain konfiguriert (optional)
- [ ] HTTPS aktiviert (automatisch)
- [ ] Preview-Deployments funktionieren

**Vercel Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### Netlify

**Setup:**
1. Repository mit Netlify verbinden
2. Build-Command: `npm run build`
3. Publish-Directory: `.next`
4. Environment-Variablen setzen

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Docker (Self-Hosted)

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.your-domain.com
      - NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

## 🔍 Post-Deployment Checks

### 1. Smoke-Tests

**Nach dem Deployment:**
- [ ] Frontend erreichbar unter Production-URL
- [ ] Login funktioniert
- [ ] Dashboard lädt
- [ ] Organization-Name wird angezeigt
- [ ] Admin kann User Management öffnen
- [ ] Invite-Link funktioniert

### 2. Performance

**Tools:**
- Lighthouse (Chrome DevTools)
- WebPageTest
- GTmetrix

**Targets:**
- [ ] Performance Score > 80
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s

### 3. Security

**Tools:**
- OWASP ZAP
- Mozilla Observatory
- Snyk

**Checks:**
- [ ] Keine kritischen Vulnerabilities
- [ ] HTTPS erzwungen
- [ ] Security Headers gesetzt

### 4. Browser-Kompatibilität

**Teste in:**
- [ ] Chrome (Latest)
- [ ] Firefox (Latest)
- [ ] Safari (Latest)
- [ ] Edge (Latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## 🐛 Troubleshooting: Production-Issues

### Issue: "No active session" in Production

**Mögliche Ursachen:**
1. Cookie-Settings falsch
2. HTTPS nicht aktiviert
3. Supabase-URL falsch

**Lösung:**
```bash
# 1. Prüfe Environment-Variablen
echo $NEXT_PUBLIC_SUPABASE_URL

# 2. Prüfe Supabase-Dashboard:
# - Ist die URL korrekt?
# - Ist der Anon-Key korrekt?

# 3. Prüfe Browser-Console:
# - Werden Cookies gesetzt?
# - Gibt es CORS-Fehler?
```

### Issue: Invite-Links funktionieren nicht

**Mögliche Ursachen:**
1. Backend nicht erreichbar
2. CORS-Fehler
3. Token-Validierung fehlgeschlagen

**Lösung:**
```bash
# Test Backend direkt:
curl https://api.your-domain.com/invites/{token}

# Sollte Invite-Daten zurückgeben
```

### Issue: Organization-Daten fehlen

**Mögliche Ursachen:**
1. Backend-Response falsch formatiert
2. API-Endpoint nicht verfügbar

**Lösung:**
```bash
# Test /auth/me Endpoint:
curl https://api.your-domain.com/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Muss organization-Feld enthalten
```

## 📊 Monitoring-Setup (Optional)

### Sentry Error-Tracking

**Installation:**
```bash
npm install @sentry/nextjs
```

**next.config.js:**
```javascript
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // Next.js config
}, {
  // Sentry config
  silent: true,
});
```

### Vercel Analytics

**Automatisch aktiviert bei Vercel-Deployment**

**Manuell:**
```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

## ✅ Final Checklist

Vor dem Go-Live:
- [ ] Alle Tests bestanden
- [ ] Documentation vollständig
- [ ] Environment-Variablen gesetzt
- [ ] Backend läuft stabil
- [ ] Database-Backups konfiguriert
- [ ] Monitoring aktiviert
- [ ] Team informiert
- [ ] Rollback-Plan vorhanden

---

**Ready to Deploy! 🚀**

Bei Problemen: Siehe [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) oder erstelle ein Issue.

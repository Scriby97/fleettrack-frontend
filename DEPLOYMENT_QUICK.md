# 🚀 FleetTrack Deployment - Quick Setup

## URLs
- **Frontend**: https://fleettrack-frontend.vercel.app/
- **Backend**: https://fleettrack-server.onrender.com/

## ✅ Frontend - Deployment bereit!

### Environment Variables (bereits konfiguriert)
Die `.env.production` Datei enthält:
```
NEXT_PUBLIC_SUPABASE_URL=https://aquipkououfwfposdfvu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_BTMZ9SNWcSTgu03Q0nTcLQ_TSjjTfU7
NEXT_PUBLIC_API_URL=https://fleettrack-server.onrender.com
```

### Vercel Deployment

#### Option 1: Git Push (Empfohlen)
```bash
git add .
git commit -m "feat: Super Admin System mit Organization Management"
git push origin main
```
Vercel deployed automatisch bei Push auf main.

#### Option 2: Vercel CLI
```bash
# Installiere Vercel CLI falls nicht vorhanden
npm i -g vercel

# Deploy to production
vercel --prod
```

### Vercel Dashboard - Environment Variables
Stelle sicher, dass diese Umgebungsvariablen in Vercel gesetzt sind:
1. Gehe zu: https://vercel.com/dashboard
2. Projekt auswählen: fleettrack-frontend
3. Settings → Environment Variables
4. Füge hinzu:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://aquipkououfwfposdfvu.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_BTMZ9SNWcSTgu03Q0nTcLQ_TSjjTfU7`
   - `NEXT_PUBLIC_API_URL` = `https://fleettrack-server.onrender.com`

## ⚠️ Backend - Erforderliche CORS-Konfiguration

Das Backend muss die Frontend-URL erlauben:

```typescript
// In deiner Backend main.ts oder app.module.ts
app.enableCors({
  origin: [
    'https://fleettrack-frontend.vercel.app',
    'http://localhost:3000'  // für lokale Entwicklung
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
});
```

**Wichtig**: Der Header `X-Organization-Id` muss erlaubt sein für Super Admin Features!

## 📋 Deployment Checklist

### Frontend
- [x] `.env.production` mit korrekter API URL
- [x] Middleware erlaubt öffentliche `/invite/*` Routes
- [x] TypeScript kompiliert ohne Fehler
- [ ] Vercel Environment Variables gesetzt
- [ ] Git Push oder `vercel --prod` ausführen

### Backend (auf Render)
- [ ] CORS erlaubt `https://fleettrack-frontend.vercel.app`
- [ ] `X-Organization-Id` Header ist erlaubt
- [ ] Alle neuen Endpoints deployed:
  - `POST /organizations` (Super Admin)
  - `GET /organizations` (Super Admin)
  - `GET /invites/:token` (public)
  - `POST /invites/accept` (public)
  - `POST /organizations/invites` (Admin)
  - `GET /organizations/invites` (Admin)
  - `DELETE /organizations/invites/:id` (Admin)
- [ ] Database Migrations ausgeführt
- [ ] Environment Variables gesetzt (JWT Secret, Database URL, etc.)

## 🧪 Test nach Deployment

### 1. Login testen
- Gehe zu https://fleettrack-frontend.vercel.app/login
- Melde dich an

### 2. Super Admin Features testen
- Gehe zu Organizations-Seite
- Erstelle neue Organization
- Prüfe ob Invite-Link funktioniert

### 3. Multi-Tenancy testen
- Wähle verschiedene Organizations aus
- Prüfe ob Daten korrekt gefiltert werden

### 4. API-Verbindung prüfen
- Browser Console öffnen (F12)
- Prüfe ob API-Calls erfolgreich sind
- Keine CORS-Fehler

## 🐛 Troubleshooting

### "Failed to fetch" Fehler
- Prüfe Backend CORS-Konfiguration
- Prüfe ob `NEXT_PUBLIC_API_URL` korrekt ist
- Prüfe Backend Server-Status auf Render

### "Unauthorized" Fehler
- Prüfe Supabase JWT-Konfiguration
- Prüfe ob Backend JWT Secret korrekt ist
- Session in Browser löschen und neu anmelden

### Build Fehler auf Vercel
```bash
# Lokal bauen zum Testen
npm run build

# Logs auf Vercel prüfen
vercel logs
```

## 📝 Neue Features in diesem Deployment

✅ **Super Admin System**
- Erstellen neuer Organizations
- Verwalten aller Organizations
- Organization-Übersicht

✅ **Multi-Tenancy**
- Organization-basierte Datenisolation
- Super Admins können Organizations wechseln
- X-Organization-Id Header-Support

✅ **Invite System**
- Email-basierte Einladungen
- Ablaufdatum für Invites
- Status-Tracking (pending, used, expired)

✅ **Enhanced User Management**
- Invite-Link mit Copy-Button
- Email-Entwurf-Funktion
- Deutsche UI-Texte

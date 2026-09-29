'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Breadcrumbs from '@/app/components/Breadcrumbs'

// Rechtstext bewusst nicht via t() uebersetzt, nur die Navigations-Labels -
// gleiches Muster wie app/impressum/page.tsx: eine deutschsprachige,
// rechtlich verbindliche Fassung statt vier parallel gepflegter Uebersetzungen.
export default function DatenschutzPage() {
  const t = useTranslations('datenschutz')

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: t('title') }]} />

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {t('title')}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Stand: September 2026
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 space-y-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              1. Verantwortliche Stelle
            </h2>
            <p>
              Verantwortlich für die Bearbeitung Ihrer Personendaten im Zusammenhang mit der
              Applikation FleetTrack (fleettrack.ch) ist:
            </p>
            <p>
              Deerworks by Nicolas Balmer<br />
              Aegertenstrasse 24<br />
              3702 Hondrich<br />
              Schweiz<br />
              <a
                href="mailto:nico.balmer@outlook.com"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                nico.balmer@outlook.com
              </a>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              2. Welche Daten wir bearbeiten
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-zinc-900 dark:text-zinc-50">Kontodaten:</strong> Vorname,
                Nachname, E-Mail-Adresse, verschlüsseltes Passwort.
              </li>
              <li>
                <strong className="text-zinc-900 dark:text-zinc-50">Organisationsdaten:</strong>{' '}
                Name und Logo der Organisation, Mitgliedschaften und Rollen.
              </li>
              <li>
                <strong className="text-zinc-900 dark:text-zinc-50">Betriebsdaten:</strong> die
                von Ihnen erfassten Fahrzeuge (Name, Kennzeichen, Typ) und Nutzungen
                (Betriebsstunden-/Kilometerstände, Treibstoffmengen, Zeitpunkt, erfassende
                Person).
              </li>
              <li>
                <strong className="text-zinc-900 dark:text-zinc-50">Zahlungsdaten:</strong> werden
                ausschliesslich von unserem Zahlungsdienstleister Stripe bearbeitet (siehe Ziff.
                5) - wir selbst speichern keine Kreditkarten- oder Kontodaten.
              </li>
              <li>
                <strong className="text-zinc-900 dark:text-zinc-50">Technische Daten:</strong>{' '}
                IP-Adresse und Zeitstempel im Rahmen des normalen Serverbetriebs (Logs), sowie ein
                Push-Benachrichtigungs-Token, falls Sie Erinnerungen aktivieren.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              3. Zweck der Bearbeitung
            </h2>
            <p>Wir bearbeiten diese Daten, um:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>FleetTrack bereitzustellen und zu betreiben (Vertragserfüllung),</li>
              <li>Organisationen, Mitgliedschaften und Einladungen zu verwalten,</li>
              <li>Abonnemente abzurechnen,</li>
              <li>Support zu Ihrem Konto zu leisten, und</li>
              <li>optionale Erinnerungen per Push-Benachrichtigung zu versenden.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              4. Rechtsgrundlage
            </h2>
            <p>
              Die Bearbeitung erfolgt zur Erfüllung des Nutzungsvertrags mit Ihnen bzw. Ihrer
              Organisation. Für optionale Funktionen (z.B. Push-Erinnerungen) erfolgt sie gestützt
              auf Ihre Einwilligung, die Sie jederzeit in den Kontoeinstellungen widerrufen können.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              5. Weitergabe an Dritte / Auftragsbearbeiter
            </h2>
            <p>Wir setzen folgende Dienstleister ein, die in unserem Auftrag Daten bearbeiten:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Supabase (Datenbank, Authentifizierung)</li>
              <li>Render (Hosting Backend)</li>
              <li>Vercel (Hosting Frontend)</li>
              <li>Stripe (Zahlungsabwicklung)</li>
            </ul>
            <p>
              Diese Anbieter können Daten auch ausserhalb der Schweiz (z.B. in der EU oder den
              USA) bearbeiten. Wir verlassen uns dabei auf die Datenschutzgarantien und
              Standardvertragsklauseln der jeweiligen Anbieter. Eine Weitergabe an weitere Dritte
              erfolgt nicht, ausser wir sind gesetzlich dazu verpflichtet.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              6. Aufbewahrungsdauer
            </h2>
            <p>
              Wir bewahren Ihre Daten so lange auf, wie Ihr Konto bzw. Ihre Organisation besteht.
              Nach Kündigung bzw. Löschung werden die Daten innert angemessener Frist gelöscht,
              soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              7. Ihre Rechte
            </h2>
            <p>
              Sie haben im Rahmen des geltenden Rechts, insbesondere des Schweizer
              Datenschutzgesetzes, das Recht auf Auskunft, Berichtigung, Löschung und Herausgabe
              Ihrer Daten (Datenportabilität). Kontaktieren Sie uns dazu unter der oben genannten
              E-Mail-Adresse.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              8. Datensicherheit
            </h2>
            <p>
              Wir setzen angemessene technische und organisatorische Massnahmen ein, um Ihre Daten
              vor unbefugtem Zugriff zu schützen, unter anderem verschlüsselte Übertragung und
              rollenbasierte Zugriffsrechte innerhalb Ihrer Organisation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              9. Cookies und lokale Speicherung
            </h2>
            <p>
              FleetTrack verwendet keine Marketing- oder Tracking-Cookies. Für die Anmeldung wird
              ein technisch notwendiges Sitzungs-Token lokal in Ihrem Browser gespeichert
              (localStorage), das für den Betrieb der App zwingend erforderlich ist.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              10. Änderungen dieser Erklärung
            </h2>
            <p>
              Wir können diese Datenschutzerklärung bei Bedarf anpassen, z.B. bei Änderungen der
              App oder der Rechtslage. Massgebend ist jeweils die unter dieser Adresse abrufbare
              aktuelle Fassung.
            </p>
          </section>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Siehe auch:{' '}
          <Link href="/agb" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            AGB
          </Link>
          {' · '}
          <Link href="/impressum" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Impressum
          </Link>
        </p>

        <Link
          href="/"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          &larr; {t('backToApp')}
        </Link>
      </div>
    </div>
  )
}

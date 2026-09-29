'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Breadcrumbs from '@/app/components/Breadcrumbs'

// Rechtstext bewusst nicht via t() uebersetzt, nur die Navigations-Labels -
// gleiches Muster wie app/impressum/page.tsx: eine deutschsprachige,
// rechtlich verbindliche Fassung statt vier parallel gepflegter Uebersetzungen.
export default function AgbPage() {
  const t = useTranslations('agb')

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
              1. Geltungsbereich
            </h2>
            <p>
              Diese allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Applikation
              FleetTrack, angeboten von Deerworks by Nicolas Balmer, Aegertenstrasse 24, 3702
              Hondrich, Schweiz (nachfolgend &bdquo;Anbieter&ldquo;). Mit der Registrierung
              akzeptieren Sie diese AGB.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              2. Leistungsbeschreibung
            </h2>
            <p>
              FleetTrack ist eine Web-Applikation zur Erfassung von Betriebsstunden,
              Kilometerständen und Treibstoffverbrauch von Fahrzeugen. Die App liefert
              Auswertungen und Exporte, die unter anderem als Grundlage für einen Antrag auf
              Rückerstattung der Mineralölsteuer beim Bundesamt für Zoll und Grenzsicherheit
              (BAZG) dienen können.
            </p>
            <p>
              Der Anbieter übernimmt keine Gewähr für die Anerkennung der erfassten Daten durch
              das BAZG oder andere Behörden. Die Korrektheit und Vollständigkeit der erfassten
              Daten liegt in der Verantwortung des Kunden.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              3. Registrierung und Vertragsschluss
            </h2>
            <p>
              Für die Nutzung ist eine Registrierung mit gültiger E-Mail-Adresse erforderlich. Der
              Vertrag zwischen dem Anbieter und dem Kunden (der registrierten Organisation) kommt
              mit erfolgreicher Registrierung bzw. mit Abschluss eines kostenpflichtigen
              Abonnements zustande.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              4. Tarife und Zahlungsbedingungen
            </h2>
            <p>
              FleetTrack wird in verschiedenen Abonnement-Tarifen angeboten (siehe
              Kontoeinstellungen für die aktuellen Preise und Leistungen). Kostenpflichtige Tarife
              werden monatlich im Voraus über den Zahlungsdienstleister Stripe abgerechnet.
            </p>
            <p>
              Der Anbieter kann die Preise mit angemessener Vorankündigung (mindestens 30 Tage)
              anpassen. Die Weiternutzung nach Ablauf dieser Frist gilt als Zustimmung zum neuen
              Preis.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              5. Laufzeit und Kündigung
            </h2>
            <p>
              Kostenpflichtige Abonnemente laufen monatlich und können jederzeit auf das Ende der
              laufenden Abrechnungsperiode gekündigt werden, über die Kontoeinstellungen oder das
              Stripe-Kundenportal. Der kostenlose Leutnant-Tarif kann jederzeit ohne Frist
              gekündigt bzw. die Organisation gelöscht werden.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              6. Pflichten des Kunden
            </h2>
            <p>
              Der Kunde ist verantwortlich für die Richtigkeit der von ihm oder seinen
              Mitarbeitenden erfassten Daten sowie für die sichere Aufbewahrung seiner
              Zugangsdaten. Der Kunde stellt sicher, dass eingeladene Mitarbeitende über die
              Erfassung ihrer Daten informiert sind.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              7. Verfügbarkeit und Haftung
            </h2>
            <p>
              Der Anbieter bemüht sich um eine hohe Verfügbarkeit von FleetTrack, garantiert diese
              jedoch nicht. Die Haftung des Anbieters für Schäden jeglicher Art wird, soweit
              gesetzlich zulässig, auf vorsätzliches und grobfahrlässiges Verhalten beschränkt und
              ist der Höhe nach auf die vom Kunden in den letzten 12 Monaten bezahlten
              Abonnementsgebühren begrenzt.
            </p>
            <p>
              Für indirekte Schäden, Folgeschäden oder entgangenen Gewinn - einschliesslich einer
              nicht erfolgten oder gekürzten Mineralölsteuer-Rückerstattung - haftet der Anbieter
              nicht.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              8. Datenschutz
            </h2>
            <p>
              Die Bearbeitung von Personendaten richtet sich nach der separaten{' '}
              <Link href="/datenschutz" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              9. Änderungen dieser AGB
            </h2>
            <p>
              Der Anbieter kann diese AGB mit angemessener Vorankündigung anpassen. Massgebend ist
              jeweils die zum Zeitpunkt der Nutzung unter dieser Adresse abrufbare aktuelle
              Fassung.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              10. Anwendbares Recht und Gerichtsstand
            </h2>
            <p>
              Es gilt Schweizer Recht. Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz des
              Anbieters.
            </p>
          </section>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Siehe auch:{' '}
          <Link href="/datenschutz" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Datenschutzerklärung
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

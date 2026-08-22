'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createSelfServiceOrganization } from '@/lib/api/organizations'
import { useAuth } from '@/lib/auth/AuthProvider'
import type { SubscriptionTier } from '@/lib/types/user'

interface PlanDefinition {
  id: SubscriptionTier
  label: string
  price: string
  maxVehicles: string
  maxMembers: string
  paid: boolean
  highlight?: boolean
}

const plans: PlanDefinition[] = [
  {
    id: 'lieutenant',
    label: 'Lieutenant',
    price: 'Kostenlos',
    maxVehicles: '2',
    maxMembers: '5',
    paid: false,
  },
  {
    id: 'captain',
    label: 'Captain',
    price: 'CHF 99.- / Monat',
    maxVehicles: '20',
    maxMembers: '50',
    paid: true,
    highlight: true,
  },
  {
    id: 'general',
    label: 'General',
    price: 'CHF 199.- / Monat',
    maxVehicles: 'Unlimitiert',
    maxMembers: 'Unlimitiert',
    paid: true,
  },
]

export default function CreateOrganizationOnboardingPage() {
  const { refreshOrganizations } = useAuth()
  const searchParams = useSearchParams()
  const wasCanceled = searchParams.get('canceled') === '1'

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('lieutenant')
  const [organizationName, setOrganizationName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlan) ?? plans[0],
    [selectedPlan]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!organizationName.trim()) {
      setError('Bitte gib einen Organisationsnamen ein.')
      return
    }

    setLoading(true)

    try {
      const result = await createSelfServiceOrganization({
        name: organizationName.trim(),
        subdomain: subdomain.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        tier: selectedPlan,
      })

      if (result.checkoutUrl) {
        // Externe Weiterleitung zu Stripe Checkout - kein Next.js-Routing
        window.location.href = result.checkoutUrl
        return
      }

      await refreshOrganizations()
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen der Organisation.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <Link href="/onboarding" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            ← Zurück
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-50">Organisation erstellen</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Wähle ein Paket und richte deine Organisation ein. Du wirst automatisch Owner der Organisation.
          </p>
        </div>

        {wasCanceled && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Die Zahlung wurde abgebrochen. Du kannst es erneut versuchen oder vorerst mit Lieutenant (kostenlos) starten.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">1) Subscription wählen</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isSelected = plan.id === selectedPlan
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={[
                      'text-left rounded-xl border p-5 transition-colors',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-blue-300 dark:hover:border-blue-700',
                    ].join(' ')}
                  >
                    {plan.highlight && (
                      <span className="inline-flex mb-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-600 text-white">
                        Beliebt
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{plan.label}</h3>
                    <p className="mt-1 text-blue-700 dark:text-blue-300 font-medium">{plan.price}</p>
                    <ul className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                      <li>{plan.maxVehicles} Fahrzeuge</li>
                      <li>{plan.maxMembers} Mitarbeiter</li>
                    </ul>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">2) Organisation konfigurieren</h2>

            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Organisationsname
              </label>
              <input
                id="organizationName"
                required
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                placeholder="z. B. Muster Logistik GmbH"
              />
            </div>

            <div>
              <label htmlFor="subdomain" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Subdomain (optional)
              </label>
              <input
                id="subdomain"
                value={subdomain}
                onChange={(event) => setSubdomain(event.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                placeholder="z. B. muster-logistik"
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Kontakt-E-Mail (optional)
              </label>
              <input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                placeholder="admin@unternehmen.de"
              />
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/60 p-5">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Zusammenfassung</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Paket: <span className="font-medium">{currentPlan.label}</span> ({currentPlan.price})
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Limits: {currentPlan.maxVehicles} Fahrzeuge, {currentPlan.maxMembers} Mitarbeiter
            </p>
            {currentPlan.paid && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Du wirst zu Stripe Checkout weitergeleitet, um die Zahlung sicher abzuschließen. Deine Organisation
                ist bereits auf dem kostenlosen Lieutenant-Paket nutzbar, sobald die Zahlung bestätigt ist, wird sie
                automatisch auf {currentPlan.label} hochgestuft.
              </p>
            )}
          </section>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Organisation wird erstellt...'
              : currentPlan.paid
                ? 'Organisation erstellen & bezahlen'
                : 'Organisation erstellen'}
          </button>
        </form>
      </div>
    </div>
  )
}

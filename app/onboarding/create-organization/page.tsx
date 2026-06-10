'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSelfServiceOrganization } from '@/lib/api/organizations'
import type { SubscriptionPlan } from '@/lib/types/user'

interface PlanDefinition {
  id: SubscriptionPlan
  label: string
  price: string
  maxVehicles: number
  maxUsers: number
  highlight?: boolean
}

const plans: PlanDefinition[] = [
  {
    id: 'starter',
    label: 'Starter',
    price: 'Gratis',
    maxVehicles: 3,
    maxUsers: 2,
  },
  {
    id: 'growth',
    label: 'Growth',
    price: '49 EUR / Monat',
    maxVehicles: 25,
    maxUsers: 10,
    highlight: true,
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: '149 EUR / Monat',
    maxVehicles: 100,
    maxUsers: 30,
  },
]

export default function CreateOrganizationOnboardingPage() {
  const router = useRouter()

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('starter')
  const [organizationName, setOrganizationName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [description, setDescription] = useState('')
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

    if (!contactEmail.trim()) {
      setError('Bitte gib eine Kontakt-E-Mail ein.')
      return
    }

    setLoading(true)

    try {
      const result = await createSelfServiceOrganization({
        name: organizationName.trim(),
        contactEmail: contactEmail.trim(),
        description: description.trim() || undefined,
        plan: selectedPlan,
      })

      if (result.checkoutUrl) {
        router.push(result.checkoutUrl)
        return
      }

      router.push('/?orgCreated=1')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen der Organisation.')
    } finally {
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
            Wähle ein Paket und richte deine Organisation ein.
          </p>
        </div>

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
                      <li>Bis zu {plan.maxVehicles} Fahrzeuge</li>
                      <li>Bis zu {plan.maxUsers} Benutzer</li>
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
              <label htmlFor="contactEmail" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Kontakt-E-Mail
              </label>
              <input
                id="contactEmail"
                type="email"
                required
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                placeholder="admin@unternehmen.de"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Beschreibung (optional)
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                placeholder="Kurze Beschreibung der Organisation"
              />
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/60 p-5">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Zusammenfassung</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Paket: <span className="font-medium">{currentPlan.label}</span> ({currentPlan.price})
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Limits: {currentPlan.maxVehicles} Fahrzeuge, {currentPlan.maxUsers} Benutzer
            </p>
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
            {loading ? 'Organisation wird erstellt...' : 'Organisation erstellen'}
          </button>
        </form>
      </div>
    </div>
  )
}

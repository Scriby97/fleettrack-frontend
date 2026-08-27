import { authenticatedFetch } from './authenticatedFetch'
import { buildApiUrl } from './url'

export interface UsageReminder {
  id?: string
  userId: string
  enabled: boolean
  reminderTime: string
  timezone: string
}

export async function getReminderSettings(): Promise<UsageReminder> {
  const response = await authenticatedFetch(buildApiUrl('/notifications/reminder'))

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Laden der Erinnerung' }))
    throw new Error(error.message || 'Fehler beim Laden der Erinnerung')
  }

  return response.json()
}

export async function updateReminderSettings(enabled: boolean, time: string): Promise<UsageReminder> {
  const response = await authenticatedFetch(buildApiUrl('/notifications/reminder'), {
    method: 'PUT',
    body: JSON.stringify({ enabled, time }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Speichern der Erinnerung' }))
    throw new Error(error.message || 'Fehler beim Speichern der Erinnerung')
  }

  return response.json()
}

export async function getVapidPublicKey(): Promise<string | null> {
  const response = await authenticatedFetch(buildApiUrl('/notifications/vapid-public-key'))

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Laden des Push-Schlüssels' }))
    throw new Error(error.message || 'Fehler beim Laden des Push-Schlüssels')
  }

  const data = await response.json()
  return data.publicKey ?? null
}

export async function registerPushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  const response = await authenticatedFetch(buildApiUrl('/notifications/push-subscription'), {
    method: 'POST',
    body: JSON.stringify(subscription),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Registrieren der Push-Benachrichtigungen' }))
    throw new Error(error.message || 'Fehler beim Registrieren der Push-Benachrichtigungen')
  }
}

export async function unregisterPushSubscription(endpoint: string): Promise<void> {
  const url = new URL(buildApiUrl('/notifications/push-subscription'))
  url.searchParams.set('endpoint', endpoint)

  const response = await authenticatedFetch(url.toString(), { method: 'DELETE' })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Entfernen der Push-Benachrichtigungen' }))
    throw new Error(error.message || 'Fehler beim Entfernen der Push-Benachrichtigungen')
  }
}

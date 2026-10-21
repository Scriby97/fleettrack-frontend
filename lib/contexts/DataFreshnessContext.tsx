'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type FC, type ReactNode } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { createClient } from '@/lib/supabase/client'
import { buildApiUrl, getApiBaseUrlOrNull } from '@/lib/api/url'
import { useOrganization } from './OrganizationContext'

interface DataFreshnessContextValue {
  // Erhoeht sich, sobald sich Nutzungen/Fahrzeuge der aktuellen Organisation
  // geaendert haben koennten - durch eine eigene Aktion (markStale()), ein
  // Server-Sent-Event vom Backend, den 2-Minuten-Sicherheits-Timer, oder weil
  // der Tab/das Fenster wieder sichtbar wurde. Datenanzeigende Komponenten
  // nehmen dataVersion in ihre Fetch-Effect-Dependencies auf, um bei
  // Aenderung neu zu laden - siehe vehicles.tsx/usages.tsx/VehicleDetail.tsx.
  dataVersion: number
  markStale: () => void
}

const DataFreshnessContext = createContext<DataFreshnessContextValue | undefined>(undefined)

// Unabhaengig vom SSE-Verbindungsstatus, bewusst immer aktiv (nicht nur als
// Fallback, wenn SSE "erkannt" down ist) - einfacher und genauso robust: die
// Korrektheit der Daten haengt so nie davon ab, ob die Live-Verbindung gerade
// funktioniert, SSE ist rein eine Beschleunigung obendrauf.
const FALLBACK_INTERVAL_MS = 2 * 60 * 1000
// Fester Retry-Abstand nach einem SSE-Verbindungsabbruch - holt bei jedem
// Versuch einen frischen Token (siehe connect() unten), daher kein
// exponentielles Backoff noetig: der 2-Minuten-Timer faengt eine laengere
// Ausfallzeit ohnehin ab.
const SSE_RECONNECT_DELAY_MS = 10_000

export const DataFreshnessProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { selectedOrgId } = useOrganization()
  const [dataVersion, setDataVersion] = useState(0)

  const markStale = useCallback(() => {
    setDataVersion((v) => v + 1)
  }, [])

  // Ref statt direkt markStale in den Closures unten, damit die SSE-/Timer-
  // Effekte nicht bei jeder dataVersion-Aenderung neu aufgesetzt werden
  // muessen (markStale selbst ist zwar stabil, aber so ist die Absicht klarer).
  // Synchronisation in einem Effect statt waehrend des Renders (siehe
  // AuthProvider.supabaseUserRef fuer dasselbe Muster in dieser Codebase).
  const markStaleRef = useRef(markStale)
  useEffect(() => {
    markStaleRef.current = markStale
  }, [markStale])

  useEffect(() => {
    if (!selectedOrgId) return
    const id = setInterval(() => markStaleRef.current(), FALLBACK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [selectedOrgId])

  // Hintergrund-Timer werden auf dem Handy gedrosselt/pausiert, wenn die App
  // im Hintergrund ist - zusaetzlich direkt beim Sichtbarwerden invalidieren,
  // statt nur auf den naechsten (evtl. verspaeteten) Timer-Tick zu warten.
  useEffect(() => {
    if (!selectedOrgId) return
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markStaleRef.current()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [selectedOrgId])

  // Server-Sent Events: Backend meldet aktiv, sobald sich in dieser
  // Organisation etwas geaendert hat (RealtimeService/-Controller im
  // Backend, siehe deren Kommentare) - schneller als auf den 2-Minuten-Timer
  // zu warten. Rein optimistisch: faellt die Verbindung dauerhaft aus
  // (Firmen-Proxy etc.), greift weiterhin der Timer-/Visibility-Fallback
  // oben, die Korrektheit haengt also nicht von SSE ab.
  useEffect(() => {
    if (!selectedOrgId) return
    const apiBaseUrl = getApiBaseUrlOrNull()
    if (!apiBaseUrl) return

    let cancelled = false
    let abortController: AbortController | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleReconnect = () => {
      if (cancelled) return
      reconnectTimer = setTimeout(() => void connect(), SSE_RECONNECT_DELAY_MS)
    }

    const connect = async () => {
      if (cancelled) return
      abortController = new AbortController()

      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) {
          scheduleReconnect()
          return
        }

        await fetchEventSource(buildApiUrl(`/organizations/${selectedOrgId}/events`), {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
          // Im Hintergrund-Tab pausieren statt offenhalten - spart Akku/Daten
          // auf dem Handy; der Visibility-Handler oben invalidiert beim
          // Zurueckkehren ohnehin sofort, unabhaengig von SSE.
          openWhenHidden: false,
          onmessage(event) {
            try {
              const payload = JSON.parse(event.data) as { type?: string }
              if (payload.type === 'changed') {
                markStaleRef.current()
              }
              // "ping"-Heartbeats (siehe Backend) sind nur zum Offenhalten
              // der Verbindung bestimmt und werden bewusst ignoriert.
            } catch {
              // Unerwartetes Payload - ignorieren statt abzustuerzen.
            }
          },
          onerror(err) {
            console.warn('SSE-Verbindung (Organisations-Events) unterbrochen:', err)
            // Wirft bewusst: fetchEventSource soll NICHT selbst mit dem
            // (moeglicherweise laengst abgelaufenen) Token weiterretryen -
            // stattdessen holen wir unten einen frischen Token und bauen die
            // Verbindung komplett neu auf.
            throw err
          },
          onclose() {
            // Server hat die Verbindung regulaer beendet - ebenfalls mit
            // frischem Token neu verbinden statt dem Default-Retry der
            // Bibliothek mit dem alten Token zu ueberlassen.
            throw new Error('SSE-Verbindung vom Server geschlossen');
          },
        })
      } catch {
        // Verbindung beendet/fehlgeschlagen - unten mit frischem Token neu verbinden.
      }

      scheduleReconnect()
    }

    void connect()

    return () => {
      cancelled = true
      abortController?.abort()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [selectedOrgId])

  return (
    <DataFreshnessContext.Provider value={{ dataVersion, markStale }}>
      {children}
    </DataFreshnessContext.Provider>
  )
}

export function useDataFreshness(): DataFreshnessContextValue {
  const ctx = useContext(DataFreshnessContext)
  if (!ctx) {
    throw new Error('useDataFreshness must be used within a DataFreshnessProvider')
  }
  return ctx
}

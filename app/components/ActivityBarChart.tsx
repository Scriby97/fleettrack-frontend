'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useDateLocale } from '@/lib/i18n/formatDate'
import type { UsageHistoryDay } from '@/lib/api/vehicles'

interface ActivityBarChartProps {
  daily: UsageHistoryDay[]
  /** 'hours' liest die Betriebsstunden-/Kilometer-Spalte, 'fuel' die Liter. */
  metric: 'hours' | 'fuel'
  /** datetime-local strings, e.g. "2026-01-01T00:00" */
  rangeStart: string
  rangeEnd: string
  unitLabel: string
  noDataLabel: string
  /** Nachkommastellen für Werte (Stunden: 1, Kilometer/Liter: 0). */
  decimals?: number
}

type Granularity = 'day' | 'week' | 'month'

interface Bucket {
  start: Date
  end: Date
  value: number
}

const DAY_MS = 86_400_000

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function startOfWeek(d: Date): Date {
  const s = startOfDay(d)
  const dow = (s.getDay() + 6) % 7 // Monday = 0
  s.setDate(s.getDate() - dow)
  return s
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function buildBuckets(
  start: Date,
  end: Date,
  granularity: Granularity,
): Bucket[] {
  const buckets: Bucket[] = []
  let cursor =
    granularity === 'day'
      ? startOfDay(start)
      : granularity === 'week'
        ? startOfWeek(start)
        : startOfMonth(start)

  // hard cap so a bad range can never blow up the DOM
  while (cursor <= end && buckets.length < 400) {
    let next: Date
    if (granularity === 'day') next = new Date(cursor.getTime() + DAY_MS)
    else if (granularity === 'week') next = new Date(cursor.getTime() + 7 * DAY_MS)
    else next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    buckets.push({ start: cursor, end: next, value: 0 })
    cursor = next
  }
  return buckets
}

function niceCeil(value: number): number {
  if (value <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(value)))
  const norm = value / mag
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return step * mag
}

export function ActivityBarChart({
  daily,
  metric,
  rangeStart,
  rangeEnd,
  unitLabel,
  noDataLabel,
  decimals,
}: ActivityBarChartProps) {
  const valueDecimals = decimals ?? (metric === 'hours' ? 1 : 0)
  const dateLocale = useDateLocale()
  const [hovered, setHovered] = useState<number | null>(null)

  // Breite des Diagramms messen, damit die Anzahl der x-Achsen-Labels sich
  // auf schmalen (v.a. mobilen) Bildschirmen reduziert statt sich zu
  // überlappen. Fallback vor der ersten Messung ist bewusst grosszügig
  // (Desktop-Verhalten unverändert), die Korrektur passiert quasi sofort
  // nach dem Mount.
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidth(width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { buckets, max, granularity, multiYear } = useMemo(() => {
    const start = new Date(rangeStart)
    const end = new Date(rangeEnd)
    const valid =
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      start <= end

    if (!valid) {
      return { buckets: [] as Bucket[], max: 1, granularity: 'day' as Granularity, multiYear: false }
    }

    const spanDays = (end.getTime() - start.getTime()) / DAY_MS
    // Strava-artig: kurze Zeiträume je Tag, ein Jahr je Woche, darüber je Monat.
    const g: Granularity = spanDays <= 62 ? 'day' : spanDays <= 400 ? 'week' : 'month'
    const bs = buildBuckets(start, end, g)

    for (const day of daily) {
      const t = parseYmd(day.date).getTime()
      const value = metric === 'hours' ? day.operatingHours : day.fuelLiters
      if (value <= 0) continue
      // buckets are contiguous & ascending -> linear scan is fine at this size
      const b = bs.find((x) => t >= x.start.getTime() && t < x.end.getTime())
      if (b) b.value += value
    }

    const rawMax = bs.reduce((m, b) => Math.max(m, b.value), 0)
    return {
      buckets: bs,
      max: niceCeil(rawMax),
      granularity: g,
      multiYear: start.getFullYear() !== end.getFullYear(),
    }
  }, [daily, metric, rangeStart, rangeEnd])

  const hasData = buckets.some((b) => b.value > 0)

  const fmtTick = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions =
      granularity === 'month'
        ? { month: 'short', year: multiYear ? '2-digit' : undefined }
        : { day: 'numeric', month: 'short' }
    return new Intl.DateTimeFormat(dateLocale, opts)
  }, [dateLocale, granularity, multiYear])

  const fmtFull = useMemo(
    () => new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }),
    [dateLocale],
  )

  const tickIndexes = useMemo(() => {
    const n = buckets.length
    if (n === 0) return []
    // ~64px Mindestabstand pro Label (Breite + Puffer), sonst überlappen sich
    // die Beschriftungen auf schmalen Bildschirmen (siehe containerWidth oben).
    const maxByWidth = Math.max(2, Math.floor(containerWidth / 64))
    const target = Math.min(6, n, maxByWidth)
    const set = new Set<number>()
    for (let i = 0; i < target; i++) {
      set.add(Math.round((i * (n - 1)) / Math.max(1, target - 1)))
    }
    return [...set].sort((a, b) => a - b)
  }, [buckets.length, containerWidth])

  const formatValue = (v: number) => v.toFixed(valueDecimals)

  const bucketLabel = (b: Bucket) => {
    if (granularity === 'day') return fmtFull.format(b.start)
    const lastDay = new Date(b.end.getTime() - DAY_MS)
    return `${fmtTick.format(b.start)} – ${fmtTick.format(lastDay)}`
  }

  if (!hasData) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{noDataLabel}</p>
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      <div className="mb-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {max} {unitLabel}
        </span>
      </div>

      <div className="relative">
        {/* obere Referenzlinie */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-zinc-200 dark:border-zinc-700" />

        <div className="relative flex h-44 items-end gap-[2px] border-b border-zinc-300 dark:border-zinc-600">
          {buckets.map((b, i) => {
            const pct = max > 0 ? (b.value / max) * 100 : 0
            return (
              <div
                key={i}
                className="group relative flex h-full flex-1 items-end"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              >
                {b.value > 0 && (
                  <div
                    className="w-full rounded-t bg-blue-500 transition-colors group-hover:bg-blue-600 dark:bg-blue-500/90 dark:group-hover:bg-blue-400"
                    style={{ height: `${Math.max(pct, 1.5)}%` }}
                    title={`${bucketLabel(b)}: ${formatValue(b.value)} ${unitLabel}`}
                  />
                )}
              </div>
            )
          })}

          {hovered !== null && buckets[hovered]?.value > 0 && (
            <div
              className="pointer-events-none absolute bottom-full z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-700"
              style={{ left: `${((hovered + 0.5) / buckets.length) * 100}%` }}
            >
              <div className="font-medium">
                {formatValue(buckets[hovered].value)} {unitLabel}
              </div>
              <div className="text-zinc-300">{bucketLabel(buckets[hovered])}</div>
            </div>
          )}
        </div>

        {/* x-Achsen-Beschriftung */}
        <div className="relative mt-1 h-4 text-[11px] text-zinc-500 dark:text-zinc-400">
          {tickIndexes.map((i) => {
            const leftPct = ((i + 0.5) / buckets.length) * 100
            const align =
              leftPct < 12 ? 'translate-x-0' : leftPct > 88 ? '-translate-x-full' : '-translate-x-1/2'
            return (
              <span
                key={i}
                className={`absolute whitespace-nowrap ${align}`}
                style={{ left: `${leftPct}%` }}
              >
                {fmtTick.format(buckets[i].start)}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

'use client';

import { useEffect, useMemo, useState, type FC } from 'react';
import { useLocale } from 'next-intl';
import { useDateLocale } from '@/lib/i18n/formatDate';

// Bewusst kein natives <input type="datetime-local"> - dessen Kalender-/Uhr-
// Popup und das kleine Icon daneben werden je nach Browser/Plattform komplett
// unterschiedlich gerendert (Chrome Desktop zeigt ein eigenes, unstylbares
// Kalender-Popup; iOS Safari zeigt zusätzlich einen eigenen Pfeil neben jedem
// selbst gebauten Icon) - liess sich nicht zuverlässig an den Rest der App
// angleichen. Dieser Picker ist komplett selbst gebaut und sieht daher überall
// gleich aus.

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function pad(n: number) {
  return String(n).padStart(2, '0');
}

// Format wie <input type="datetime-local"> (lokale Zeit, kein "Z"/Offset) -
// exakt dasselbe Format, das der Rest der App (toDatetimeLocalValue,
// new Date(value).toISOString() beim Speichern) bereits erwartet, damit
// dieser Picker ohne Aenderungen an Speicher-/Entwurfslogik eingesetzt
// werden kann.
function formatValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseValue(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
}

interface DateTimePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  nowLabel: string;
}

export const DateTimePicker: FC<DateTimePickerProps> = ({ id, value, onChange, required, disabled, nowLabel }) => {
  const locale = useLocale();
  const dateLocale = useDateLocale();
  const [open, setOpen] = useState(false);

  const selected = parseValue(value);
  const [cursor, setCursor] = useState<Date>(selected ?? new Date());

  // Beim Oeffnen immer den Monat des aktuell ausgewaehlten Werts zeigen,
  // nicht den zuletzt durchgeblaetterten.
  useEffect(() => {
    if (open) setCursor(selected ?? new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    // 2024-01-01 ist ein Montag - Basis fuer eine montags-startende Woche.
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => fmt.format(addDays(base, i)));
  }, [locale]);

  const days = useMemo(() => {
    const start = startOfMonth(cursor);
    const startWeekDay = (start.getDay() + 6) % 7;
    const gridStart = addDays(start, -startWeekDay);
    const end = endOfMonth(cursor);
    const endWeekDay = (end.getDay() + 6) % 7;
    const gridEnd = addDays(end, 6 - endWeekDay);
    const result: Date[] = [];
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) {
      result.push(new Date(d));
    }
    return result;
  }, [cursor]);

  const selectDay = (day: Date) => {
    const base = selected ?? new Date();
    onChange(formatValue(new Date(day.getFullYear(), day.getMonth(), day.getDate(), base.getHours(), base.getMinutes())));
    setOpen(false);
  };

  const changeTime = (hours: number, minutes: number) => {
    const base = selected ?? new Date();
    onChange(formatValue(new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes)));
  };

  const setNow = () => {
    onChange(formatValue(new Date()));
    setOpen(false);
  };

  const today = new Date();
  const displayValue = selected
    ? selected.toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-left text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{displayValue}</span>
        <svg className="w-4 h-4 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      </button>

      {/* Visuell verstecktes, aber im DOM vorhandenes Spiegel-Input: haelt den
          rohen Wert fuer natives Formular-required greifbar und per
          document.getElementById(id) programmatisch/testbar zugaenglich,
          ohne dass User es je zu Gesicht bekommen (die eigentliche Bedienung
          laeuft ueber den Button/Popover oben). */}
      <input
        id={id}
        type="text"
        value={value}
        required={required}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />

      {open && (
        <>
          {/* Unsichtbarer Vollbild-Tap-Catcher zum Schliessen (gleiches Muster
              wie OrgSwitcher) - kein document-"mousedown"-Listener, der auf
              iOS Safari zuverlaessig den eigentlichen Tap auf eine Option
              schluckt. */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 shadow-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                aria-label="Vorheriger Monat"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 capitalize">
                {cursor.toLocaleString(dateLocale, { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                aria-label="Nächster Monat"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {weekdayLabels.map((w) => (
                <div key={w} className="text-center text-[11px] font-medium text-zinc-500 dark:text-zinc-400 py-1 capitalize">{w}</div>
              ))}
              {days.map((day) => {
                const inMonth = day.getMonth() === cursor.getMonth();
                const isSelected = selected && day.toDateString() === selected.toDateString();
                const isToday = day.toDateString() === today.toDateString();
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={[
                      'aspect-square rounded-lg text-sm transition-colors',
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold'
                        : isToday
                          ? 'text-blue-600 dark:text-blue-400 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-700'
                          : inMonth
                            ? 'text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                            : 'text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700',
                    ].join(' ')}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={selected ? pad(selected.getHours()) : ''}
                  onChange={(e) => changeTime(Math.min(23, Math.max(0, Number(e.target.value) || 0)), selected?.getMinutes() ?? 0)}
                  className="w-14 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-center text-sm text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  aria-label="Stunde"
                />
                <span className="text-zinc-500">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={selected ? pad(selected.getMinutes()) : ''}
                  onChange={(e) => changeTime(selected?.getHours() ?? 0, Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-14 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-center text-sm text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  aria-label="Minute"
                />
              </div>
              <button
                type="button"
                onClick={setNow}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
                {nowLabel}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

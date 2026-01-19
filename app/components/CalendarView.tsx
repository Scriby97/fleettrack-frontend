'use client';

import React, { useState, useMemo } from 'react';

interface Event {
  id: string | number;
  title: string;
  start: string; // ISO or datetime-local-ish
  end: string;
}

interface Props {
  events: Event[];
  onEventClick?: (eventId: string | number) => void;
}

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

function formatDayHeader(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function sameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarView({ events, onEventClick }: Props) {
  const [mode, setMode] = useState<'month' | 'week'>('month');
  const [cursor, setCursor] = useState<Date>(new Date());

  const monthRange = useMemo(() => {
    const start = startOfMonth(cursor);
    // find week start (mon)
    const startWeekDay = (start.getDay() + 6) % 7; // make Monday=0
    const gridStart = addDays(start, -startWeekDay);
    const end = endOfMonth(cursor);
    const endWeekDay = (end.getDay() + 6) % 7;
    const gridEnd = addDays(end, 6 - endWeekDay);

    const days: Date[] = [];
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [cursor]);

  const weekRange = useMemo(() => {
    const today = cursor;
    const weekStart = addDays(today, -((today.getDay() + 6) % 7));
    const days = [] as Date[];
    for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));
    return days;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach((ev) => {
      const s = new Date(ev.start);
      const e = new Date(ev.end);
      for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
        const key = d.toDateString();
        const list = map.get(key) ?? [];
        list.push(ev);
        map.set(key, list);
      }
    });
    return map;
  }, [events]);

  const gotoPrev = () => setCursor((c) => (mode === 'month' ? new Date(c.getFullYear(), c.getMonth() - 1, 1) : addDays(c, -7)));
  const gotoNext = () => setCursor((c) => (mode === 'month' ? new Date(c.getFullYear(), c.getMonth() + 1, 1) : addDays(c, 7)));
  const gotoToday = () => setCursor(new Date());

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header - Stacked on mobile, side-by-side on larger screens */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex gap-1 sm:gap-2">
            <button onClick={gotoPrev} className="px-2 sm:px-3 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">&lt;</button>
            <button onClick={gotoToday} className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">Heute</button>
            <button onClick={gotoNext} className="px-2 sm:px-3 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">&gt;</button>
          </div>
          <h2 className="text-base sm:text-lg font-medium sm:hidden">{cursor.toLocaleString(undefined, { month: 'short', year: 'numeric' })}</h2>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <h2 className="hidden sm:block text-lg font-medium">{cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <div className="flex gap-1 sm:gap-2">
            <button onClick={() => setMode('month')} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded ${mode === 'month' ? 'bg-zinc-200 dark:bg-zinc-700' : 'bg-transparent border border-zinc-300 dark:border-zinc-600'}`}>Monat</button>
            <button onClick={() => setMode('week')} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded ${mode === 'week' ? 'bg-zinc-200 dark:bg-zinc-700' : 'bg-transparent border border-zinc-300 dark:border-zinc-600'}`}>Woche</button>
          </div>
        </div>
      </div>

      {mode === 'month' ? (
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {['Mo','Di','Mi','Do','Fr','Sa','So'].map((h) => (
            <div key={h} className="text-center text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 py-1">{h}</div>
          ))}
          {monthRange.map((d) => {
            const key = d.toDateString();
            const evs = eventsByDay.get(key) ?? [];
            const inMonth = d.getMonth() === cursor.getMonth();
            return (
              <div key={key} className={`min-h-[60px] sm:min-h-[90px] border border-zinc-200 dark:border-zinc-700 rounded p-1 sm:p-2 ${inMonth ? '' : 'text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50'}`}>
                <div className="text-[10px] sm:text-xs font-semibold">{d.getDate()}</div>
                <div className="mt-0.5 sm:mt-1 space-y-0.5 sm:space-y-1">
                  {evs.slice(0, 2).map((ev) => (
                    <div 
                      key={ev.id} 
                      className="text-[9px] sm:text-xs bg-blue-50 dark:bg-blue-900/30 rounded px-0.5 sm:px-1 py-0.5 truncate cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      onClick={() => onEventClick?.(ev.id)}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {evs.length > 2 && <div className="text-[9px] sm:text-xs text-zinc-500">+{evs.length - 2}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {weekRange.map((d) => (
              <div key={d.toDateString()} className="min-h-[80px] sm:min-h-[120px] border border-zinc-200 dark:border-zinc-700 rounded p-1 sm:p-2">
                <div className="text-[10px] sm:text-xs font-semibold">{d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</div>
                <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
                  {(eventsByDay.get(d.toDateString()) ?? []).map((ev) => (
                    <div 
                      key={ev.id} 
                      className="text-[9px] sm:text-sm bg-blue-50 dark:bg-blue-900/30 rounded px-0.5 sm:px-1 py-0.5 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      onClick={() => onEventClick?.(ev.id)}
                      title={ev.title}
                    >
                      <span className="block truncate">{ev.title}</span>
                      <span className="hidden sm:inline text-xs text-zinc-500">{new Date(ev.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

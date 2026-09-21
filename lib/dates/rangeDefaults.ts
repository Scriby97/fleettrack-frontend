// Formatiert ein Date fuer <input type="datetime-local"> (lokale Zeit, kein "Z"/Offset)
export const toDatetimeLocalValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Default-Zeitraum "letzte 12 Monate" - etabliertes Muster aus der
// Flottenübersicht/dem Excel-Export, wiederverwendet für weitere Ansichten mit
// Zeitraum-Filter (z.B. Übersicht Nutzungen), damit deren Standard-Abfrage
// nicht unbegrenzt mit der gesamten Historie mitwächst.
export const defaultRangeStart = (): string => {
  const now = new Date()
  return toDatetimeLocalValue(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()))
}

export const defaultRangeEnd = (): string => toDatetimeLocalValue(new Date())

/**
 * Eine CSV-Zelle: in Anführungszeichen, falls sie Trennzeichen/Anführungszeichen/
 * Zeilenumbrüche enthält; enthaltene Anführungszeichen werden verdoppelt.
 */
export function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function csvRow(cells: Array<string | number>): string {
  return cells.map((c) => csvCell(String(c))).join(',')
}

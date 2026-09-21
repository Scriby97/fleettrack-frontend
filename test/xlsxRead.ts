// Kleiner Leser fuer .xlsx-Dateien, wie unser Export sie schreibt (ZIP ohne
// Kompression + Inline-Strings). Nur fuer Tests.

export interface ZipEntry {
  name: string
  data: Uint8Array
  storedCrc: number
  method: number
}

export function readStoredZip(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('kein ZIP: End-of-central-directory fehlt')

  const count = view.getUint16(eocd + 10, true)
  let pos = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []

  for (let i = 0; i < count; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error('kaputter ZIP-Verzeichniseintrag')
    const method = view.getUint16(pos + 10, true)
    const storedCrc = view.getUint32(pos + 16, true)
    const size = view.getUint32(pos + 24, true)
    const nameLen = view.getUint16(pos + 28, true)
    const extraLen = view.getUint16(pos + 30, true)
    const commentLen = view.getUint16(pos + 32, true)
    const localOffset = view.getUint32(pos + 42, true)
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen))

    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('kaputter lokaler Header')
    const localNameLen = view.getUint16(localOffset + 26, true)
    const localExtraLen = view.getUint16(localOffset + 28, true)
    const start = localOffset + 30 + localNameLen + localExtraLen
    entries.push({ name, data: bytes.slice(start, start + size), storedCrc, method })

    pos += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

export function entryText(entries: ZipEntry[], name: string): string {
  const entry = entries.find((e) => e.name === name)
  if (!entry) throw new Error(`Eintrag fehlt: ${name}`)
  return new TextDecoder().decode(entry.data)
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

function columnIndex(letters: string): number {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

// Liefert die Zellwerte je Zeile (0-basiert; leere Zellen = null).
export function readSheetRows(sheetXml: string): Array<Array<string | number | null>> {
  const rows: Array<Array<string | number | null>> = []
  for (const match of sheetXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g)) {
    const col = columnIndex(match[1])
    const row = Number(match[2]) - 1
    const attrs = match[3]
    const body = match[4]

    let value: string | number
    if (/t="inlineStr"/.test(attrs)) {
      const text = body.match(/<t[^>]*>([\s\S]*?)<\/t>/)
      value = unescapeXml(text ? text[1] : '')
    } else {
      value = Number(body.match(/<v>([\s\S]*?)<\/v>/)![1])
    }
    rows[row] ??= []
    rows[row][col] = value
  }
  // Luecken (leere Zeilen/Zellen) als null auffuellen
  for (let r = 0; r < rows.length; r++) {
    rows[r] ??= []
    for (let c = 0; c < rows[r].length; c++) rows[r][c] ??= null
  }
  return rows
}

// Stil-Index (s="...") einer Zelle, z.B. cellStyle(xml, 'F4')
export function cellStyle(sheetXml: string, ref: string): number | null {
  const match = sheetXml.match(new RegExp(`<c r="${ref}"([^>]*)>`))
  const style = match?.[1].match(/s="(\d+)"/)
  return style ? Number(style[1]) : null
}

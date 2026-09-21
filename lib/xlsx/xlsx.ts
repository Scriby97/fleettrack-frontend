/**
 * Minimaler Excel-Export (.xlsx) ohne Abhaengigkeit: eine .xlsx-Datei ist ein
 * ZIP-Paket aus ein paar XML-Dateien. Wir schreiben ein Tabellenblatt mit
 * Text- und Zahlenzellen. Im Gegensatz zu CSV gibt es weder ein Trennzeichen
 * noch Kodierungs- oder Dezimalzeichen-Probleme: Excel liest Zahlen als Zahlen
 * und Umlaute korrekt, egal welche Regionaleinstellungen der Rechner hat.
 */

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export type XlsxStyle = 'header' | 'hours' | 'integer'
export type XlsxValue = string | number | null
export type XlsxCell = XlsxValue | { value: XlsxValue; style?: XlsxStyle }

export interface XlsxSheet {
  name: string
  rows: XlsxCell[][]
  // Spaltenbreiten in Zeichen (optional)
  columnWidths?: number[]
}

const encoder = new TextEncoder()

// Reihenfolge = Index in <cellXfs> in styles.xml
const STYLE_INDEX: Record<XlsxStyle, number> = { header: 1, hours: 2, integer: 3 }

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

interface ZipFile {
  name: string
  data: Uint8Array
}

// ZIP ohne Kompression ("stored") - fuer diese kleinen XML-Dateien voellig ausreichend.
function zipStored(files: ZipFile[]): Uint8Array {
  const DOS_TIME = 0
  const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const size = file.data.length
    const crc = crc32(file.data)

    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // Dateinamen sind UTF-8
    lv.setUint16(8, 0, true) // keine Kompression
    lv.setUint16(10, DOS_TIME, true)
    lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)
    parts.push(local, file.data)

    const entry = new Uint8Array(46 + name.length)
    const ev = new DataView(entry.buffer)
    ev.setUint32(0, 0x02014b50, true)
    ev.setUint16(4, 20, true)
    ev.setUint16(6, 20, true)
    ev.setUint16(8, 0x0800, true)
    ev.setUint16(10, 0, true)
    ev.setUint16(12, DOS_TIME, true)
    ev.setUint16(14, DOS_DATE, true)
    ev.setUint32(16, crc, true)
    ev.setUint32(20, size, true)
    ev.setUint32(24, size, true)
    ev.setUint16(28, name.length, true)
    ev.setUint32(42, offset, true)
    entry.set(name, 46)
    central.push(entry)

    offset += local.length + size
  }

  const centralSize = central.reduce((sum, e) => sum + e.length, 0)
  const end = new Uint8Array(22)
  const dv = new DataView(end.buffer)
  dv.setUint32(0, 0x06054b50, true)
  dv.setUint16(8, files.length, true)
  dv.setUint16(10, files.length, true)
  dv.setUint32(12, centralSize, true)
  dv.setUint32(16, offset, true)

  const all = [...parts, ...central, end]
  const result = new Uint8Array(all.reduce((sum, p) => sum + p.length, 0))
  let pos = 0
  for (const p of all) {
    result.set(p, pos)
    pos += p.length
  }
  return result
}

// Zeichen, die in XML 1.0 nicht vorkommen duerfen, wuerden die Datei unlesbar machen.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g

function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function columnLetter(index: number): string {
  let n = index + 1
  let letters = ''
  while (n > 0) {
    const rest = (n - 1) % 26
    letters = String.fromCharCode(65 + rest) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

// Excel erlaubt max. 31 Zeichen und keine der Zeichen  \ / ? * [ ] :
function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31)
  return cleaned || 'Tabelle1'
}

function renderCell(cell: XlsxCell, ref: string): string {
  const { value, style } =
    cell !== null && typeof cell === 'object' ? cell : { value: cell, style: undefined }
  const s = style ? ` s="${STYLE_INDEX[style]}"` : ''

  if (value === null || value === '') return ''
  if (typeof value === 'number') {
    return Number.isFinite(value) ? `<c r="${ref}"${s}><v>${value}</v></c>` : ''
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

function renderSheet(sheet: XlsxSheet): string {
  const cols = sheet.columnWidths?.length
    ? `<cols>${sheet.columnWidths
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
        .join('')}</cols>`
    : ''

  const rows = sheet.rows
    .map((row, r) => {
      const cells = row.map((cell, c) => renderCell(cell, `${columnLetter(c)}${r + 1}`)).join('')
      return cells ? `<row r="${r + 1}">${cells}</row>` : ''
    })
    .join('')

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    cols +
    `<sheetData>${rows}</sheetData>` +
    '</worksheet>'
  )
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>'

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>'

const WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>'

// xf 0 = Standard, 1 = Kopfzeile (fett, hellgrau), 2 = Zahl mit 1 Nachkommastelle, 3 = ganze Zahl
const STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts>' +
  '<fonts count="2">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFE8EDF5"/><bgColor indexed="64"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="4">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

function renderWorkbook(sheetName: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    '</workbook>'
  )
}

export function buildXlsx(sheet: XlsxSheet): Uint8Array {
  const name = sanitizeSheetName(sheet.name)
  return zipStored([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: encoder.encode(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: encoder.encode(renderWorkbook(name)) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(WORKBOOK_RELS) },
    { name: 'xl/styles.xml', data: encoder.encode(STYLES) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(renderSheet(sheet)) },
  ])
}

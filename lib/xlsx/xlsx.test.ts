// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { buildXlsx, crc32, XLSX_MIME } from './xlsx'
import { cellStyle, entryText, readSheetRows, readStoredZip } from '@/test/xlsxRead'

const build = (rows: Parameters<typeof buildXlsx>[0]['rows'], extra = {}) =>
  buildXlsx({ name: 'Flotte', rows, ...extra })

const sheetXml = (bytes: Uint8Array) => entryText(readStoredZip(bytes), 'xl/worksheets/sheet1.xml')

describe('crc32', () => {
  it('matches the well-known check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('is 0 for empty input', () => {
    expect(crc32(new Uint8Array())).toBe(0)
  })
})

describe('buildXlsx package', () => {
  it('has the MIME type Excel expects for .xlsx', () => {
    expect(XLSX_MIME).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  })

  it('is a ZIP that starts with the local file header signature', () => {
    const bytes = build([['a']])

    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])
  })

  it('contains exactly the parts of a minimal workbook', () => {
    const names = readStoredZip(build([['a']])).map((e) => e.name)

    expect(names).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ])
  })

  it('stores every part uncompressed with a matching checksum', () => {
    for (const entry of readStoredZip(build([['Grüezi', 1.5]]))) {
      expect(entry.method).toBe(0)
      expect(entry.storedCrc).toBe(crc32(entry.data))
    }
  })

  it('writes well-formed XML in every part', () => {
    const entries = readStoredZip(
      build([[{ value: 'Kopf', style: 'header' }, 'A & B <c> "d"', 1.5, { value: 3, style: 'integer' }]], {
        columnWidths: [20, 10],
      }),
    )

    for (const entry of entries) {
      const doc = new DOMParser().parseFromString(new TextDecoder().decode(entry.data), 'application/xml')
      expect(doc.getElementsByTagName('parsererror'), entry.name).toHaveLength(0)
    }
  })
})

describe('cells', () => {
  it('round-trips text with umlauts, symbols and special characters unchanged', () => {
    const texts = ['Grüezi', 'Süd – Nord — Quad', 'A & B', '<b>fett</b>', 'sagt "hallo"', 'a;b,c', "l'apostrophe"]

    const rows = readSheetRows(sheetXml(build([texts])))

    expect(rows[0]).toEqual(texts)
  })

  it('keeps leading and trailing spaces', () => {
    const xml = sheetXml(build([['  eingerückt  ']]))

    // ohne xml:space="preserve" wuerde Excel die Leerzeichen am Rand verwerfen
    expect(xml).toContain('xml:space="preserve"')
    expect(readSheetRows(xml)[0][0]).toBe('  eingerückt  ')
  })

  it('writes numbers as real numbers, not as text', () => {
    const xml = sheetXml(build([[10.8, 0, -3, 1234.5]]))

    expect(xml).toContain('<c r="A1"><v>10.8</v></c>')
    expect(xml).not.toMatch(/t="inlineStr"/)
    expect(readSheetRows(xml)[0]).toEqual([10.8, 0, -3, 1234.5])
  })

  it('omits empty cells, empty rows and non-finite numbers', () => {
    const xml = sheetXml(build([['a', null, '', 'd'], [], [NaN, Infinity, 'x']]))

    expect(readSheetRows(xml)).toEqual([['a', null, null, 'd'], [], [null, null, 'x']])
    expect(xml).not.toContain('<row r="2">')
    expect(xml).not.toContain('NaN')
    expect(xml).not.toContain('Infinity')
  })

  it('uses letters beyond Z for wide tables', () => {
    const row = Array.from({ length: 28 }, (_, i) => i + 1)

    const xml = sheetXml(build([row]))

    expect(xml).toContain('<c r="Z1"><v>26</v></c>')
    expect(xml).toContain('<c r="AA1"><v>27</v></c>')
    expect(xml).toContain('<c r="AB1"><v>28</v></c>')
  })

  it('removes characters that are not allowed in XML instead of corrupting the file', () => {
    const rows = readSheetRows(sheetXml(build([['a\u0000b\u0008c\u001Fd']])))

    expect(rows[0][0]).toBe('abcd')
  })

  it('applies the requested styles', () => {
    const xml = sheetXml(
      build([[{ value: 'Kopf', style: 'header' }, { value: 1.5, style: 'hours' }, { value: 3, style: 'integer' }, 'plain']]),
    )

    expect(cellStyle(xml, 'A1')).toBe(1)
    expect(cellStyle(xml, 'B1')).toBe(2)
    expect(cellStyle(xml, 'C1')).toBe(3)
    expect(cellStyle(xml, 'D1')).toBeNull()
  })

  it('defines exactly the styles it references', () => {
    const styles = entryText(readStoredZip(build([['a']])), 'xl/styles.xml')

    expect(styles).toContain('<cellXfs count="4">')
    expect(styles).toContain('formatCode="0.0"')
  })
})

describe('sheet', () => {
  it('sets column widths when given', () => {
    const xml = sheetXml(build([['a']], { columnWidths: [28, 16] }))

    expect(xml).toContain('<col min="1" max="1" width="28" customWidth="1"/>')
    expect(xml).toContain('<col min="2" max="2" width="16" customWidth="1"/>')
  })

  it('has no <cols> element without widths', () => {
    expect(sheetXml(build([['a']]))).not.toContain('<cols>')
  })

  it('names the sheet and removes characters Excel does not allow', () => {
    const bytes = buildXlsx({ name: 'Flotte: Süd/Nord [1]?', rows: [['a']] })

    expect(entryText(readStoredZip(bytes), 'xl/workbook.xml')).toContain('name="Flotte  Süd Nord  1"')
  })

  it('limits the sheet name to 31 characters and falls back to a default', () => {
    const long = buildXlsx({ name: 'x'.repeat(50), rows: [['a']] })
    const empty = buildXlsx({ name: '  ', rows: [['a']] })

    expect(entryText(readStoredZip(long), 'xl/workbook.xml')).toContain(`name="${'x'.repeat(31)}"`)
    expect(entryText(readStoredZip(empty), 'xl/workbook.xml')).toContain('name="Tabelle1"')
  })
})

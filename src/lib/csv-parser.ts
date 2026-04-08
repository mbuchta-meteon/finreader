/**
 * Robust CSV parser that handles:
 * - Quoted fields with commas inside (RFC 4180)
 * - Semicolon delimiters (common in European bank exports)
 * - Mixed line endings (CRLF / LF)
 * - Corrupted rows (wrong column count — skipped with warning)
 * - BOM character at start of file
 */

export function parseCSV(raw: string): string {
  // Strip BOM
  const text = raw.replace(/^\uFEFF/, '').trim()
  const lines = text.split(/\r?\n/)
  if (lines.length < 2) return raw  // not enough data, return as-is

  // Auto-detect delimiter: count semicolons vs commas in first line
  const firstLine = lines[0]
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const commas     = (firstLine.match(/,/g) ?? []).length
  const delim      = semicolons >= commas ? ';' : ','

  const rows: string[][] = []
  for (const line of lines) {
    if (!line.trim()) continue
    rows.push(splitCSVLine(line, delim))
  }

  if (rows.length < 2) return raw

  const headers = rows[0]
  const expected = headers.length
  const output: string[] = [headers.join('\t')]  // convert to TSV for AI (no ambiguity)

  let skipped = 0
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length !== expected) {
      skipped++
      continue  // skip malformed rows silently
    }
    output.push(row.join('\t'))
  }

  const result = output.join('\n')
  if (skipped > 0) {
    return `[CSV parsed: ${rows.length - 1} rows, ${skipped} malformed rows skipped]\n${result}`
  }
  return `[CSV parsed: ${rows.length - 1} rows]\n${result}`
}

function splitCSVLine(line: string, delim: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'  // escaped quote
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delim && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

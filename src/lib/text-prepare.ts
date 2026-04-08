/**
 * Prepares extracted text for AI analysis.
 *
 * Strategy:
 * - Small docs (≤24k chars)  → send as-is
 * - Medium PDFs (24k–80k)    → head + tail with gap note
 * - Large PDFs (>80k)        → extract only transaction lines
 * - Any CSV                  → strip descriptions, keep date+amount+merchant columns only
 *
 * Goal: always produce output ≤ 24k chars so the prompt + schema fits
 * comfortably within a 32k-token context window.
 */

const TARGET_LIMIT  = 24_000   // hard target for text sent to AI
const SUMMARY_MODE  = 80_000   // PDFs above this → transaction-line extraction

export function prepareText(raw: string): string {
  if (raw.length <= TARGET_LIMIT) return raw

  if (raw.startsWith('[CSV parsed:')) {
    return prepareCSV(raw)
  }

  return preparePDF(raw)
}

// ── CSV ───────────────────────────────────────────────────────────────────────
// CSV rows are tab-separated: Date \t Amount \t Description \t ...
// Strategy: keep ALL rows but strip each cell to the minimum useful length.
// Date (col 0): keep full. Amount (col 1): keep full. Others: truncate to 40.
function prepareCSV(text: string): string {
  const lines   = text.split('\n')
  const banner  = lines[0]      // "[CSV parsed: N rows]"
  const colLine = lines[1] || ''
  const rows    = lines.slice(2).filter(l => l.trim())

  // Compress each row: full date, full amount, short description
  const compressed = rows.map(line => {
    const cells = line.split('\t')
    return cells.map((cell, i) => {
      if (i === 0) return cell                  // date — keep full
      if (/^[-+]?\s*[\d\s]+[,.]\d{2}$/.test(cell.trim())) return cell  // amount — keep full
      return cell.slice(0, 40)                  // description — truncate
    }).join('\t')
  })

  // Fit as many rows as possible within TARGET_LIMIT (newest = last rows)
  const prefix = `${banner}\n${colLine}\n`
  let built = ''
  let kept  = 0

  // Iterate newest-first (reversed), then reverse back
  const reversed = [...compressed].reverse()
  for (const line of reversed) {
    if (prefix.length + built.length + line.length + 2 > TARGET_LIMIT) break
    built = line + '\n' + built
    kept++
  }

  const skipped = rows.length - kept
  const note = skipped > 0
    ? `${banner} — newest ${kept} of ${rows.length} rows shown (${skipped} oldest trimmed)`
    : banner

  return `${note}\n${colLine}\n${built.trimEnd()}`
}

// ── PDF ───────────────────────────────────────────────────────────────────────
function preparePDF(text: string): string {
  // Very large: extract transaction lines only
  if (text.length > SUMMARY_MODE) {
    return extractTransactionLines(text)
  }

  // Medium: head (account info) + tail (recent transactions)
  const head    = text.slice(0, 16_000)
  const tail    = text.slice(-7_000)
  const skipped = text.length - 16_000 - 7_000
  return `${head}\n\n[...~${Math.round(skipped / 1000)}k chars omitted from middle...]\n\n${tail}`
}

function extractTransactionLines(text: string): string {
  const lines = text.split('\n')

  // Always keep the first 25 lines (account number, owner, period header)
  const header = lines.slice(0, 25).join('\n')

  const dateRe   = /\d{1,2}\.\s*\d{1,2}\.\s*\d{4}|\d{4}-\d{2}-\d{2}/
  const amountRe = /[-+]?\s*[\d\s]{1,10}[,.][\d]{2}/

  const kept: string[] = []
  for (const line of lines.slice(25)) {
    const l = line.trim()
    if (!l) continue
    if (dateRe.test(l) && amountRe.test(l)) {
      kept.push(l.slice(0, 180))   // each line capped at 180 chars
    }
    if (header.length + kept.join('\n').length > TARGET_LIMIT - 300) break
  }

  return (
    `${header}\n\n` +
    `[LARGE DOCUMENT — extracted ${kept.length} transaction lines from ${lines.length} total]\n\n` +
    kept.join('\n')
  )
}

// ── Chunk splitter (for future streaming/multi-chunk support) ─────────────────
// Splits a multi-month statement into monthly chunks by detecting month boundaries.
// Returns array of { label, text } ready to be analyzed separately and merged.
export function splitIntoMonthChunks(raw: string): Array<{ label: string; text: string }> {
  const lines = raw.split('\n')

  // Detect lines that mark a new month (e.g. "Leden 2026", "January 2026", "2026-01")
  const monthHeaderRe = /\b(january|february|march|april|may|june|july|august|september|october|november|december|leden|únor|březen|duben|květen|červen|červenec|srpen|září|říjen|listopad|prosinec)\b.*\b(20\d{2})\b|(20\d{2})[-\/](0[1-9]|1[0-2])/i

  const chunks: Array<{ label: string; start: number }> = []

  lines.forEach((line, i) => {
    if (monthHeaderRe.test(line)) {
      chunks.push({ label: line.trim().slice(0, 40), start: i })
    }
  })

  if (chunks.length < 2) {
    // Can't split — return as single chunk
    return [{ label: 'full statement', text: raw }]
  }

  return chunks.map((chunk, i) => {
    const end = chunks[i + 1]?.start ?? lines.length
    return {
      label: chunk.label,
      text: lines.slice(chunk.start, end).join('\n'),
    }
  })
}

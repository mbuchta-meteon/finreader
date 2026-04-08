import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/ai-provider'
import { parseCSV } from '@/lib/csv-parser'
import type { ProviderName, Language } from '@/lib/types'
import type { FileData } from '@/lib/ai-provider'
import { auth } from '@/lib/auth'
import { hasUsedFreeTier, hasOwnerUsedFreeTier, recordFreeUsage, saveAnalysis, getUserById, recordApiUsage } from '@/lib/db'
import { getFingerprint, getIP } from '@/lib/fingerprint'
import { verifyTurnstile } from '@/lib/turnstile'
import { checkRateLimit } from '@/lib/rate-limit'

// ── Constants ──────────────────────────────────────────────────────────────────
const VISION_TYPES = new Set(['application/pdf','image/jpeg','image/jpg','image/png','image/gif','image/webp','image/bmp'])
const TEXT_TYPES   = new Set(['text/csv','text/plain'])
const FREE_MAX_FILE_SIZE = 2 * 1024 * 1024   // 2MB

// ── Helpers ────────────────────────────────────────────────────────────────────
function guessMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    pdf:'application/pdf', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg',
    gif:'image/gif', webp:'image/webp', bmp:'image/bmp', csv:'text/csv', txt:'text/plain',
  }
  return map[ext] ?? 'application/octet-stream'
}

function autoSelectProvider(mimeType: string, textLength = 0, isPro = false): ProviderName {
  if (!isPro) return 'gemini'   // free tier always Standard
  if (VISION_TYPES.has(mimeType)) return process.env.GEMINI_API_KEY ? 'gemini' : 'haiku'
  if (textLength < 5_000)  return 'gemini'
  if (textLength < 25_000) return 'haiku'
  return 'claude'
}

/**
 * Quick owner name extraction from raw text WITHOUT calling AI.
 * Looks for labelled patterns ("Klient:", "Account holder:", "Majitel:") first,
 * then falls back to the first capitalised two-word name near the top.
 * Used only for pre-blocking the free tier — never shown to the user.
 */
function quickExtractOwner(text: string): string {
  const head = text.slice(0, 2000)

  // Priority 1: explicitly labelled owner fields (handles with/without diacritics)
  const labelled = head.match(
    /(?:account\s*holder|majitel(?:\s*u[cč]tu)?|klient|cliente|inhaber|titulaire|owner|jm[eé]no|name)\s*[:\-]\s*([A-Za-záčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýžA-Za-z]+(?:[ \t]+[A-Za-záčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýžA-Za-z]+){1,3})(?=\s*[\r\n,;]|$)/im
  )
  if (labelled?.[1] && labelled[1].length >= 5) return labelled[1].trim()

  // Priority 2: first standalone capitalised two-word sequence (e.g. "Jan Novak")
  const freeform = head.match(
    /\b([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]{2,}\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]{2,}(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]{2,})?)\b/
  )
  if (freeform?.[1] && freeform[1].length >= 5) return freeform[1].trim()

  return ''
}

// ── Main handler ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session  = await auth()
  const userId   = session?.user?.id as string | undefined
  const userRole = (session?.user as any)?.role as string | undefined
  const isPro    = userRole === 'pro' || userRole === 'admin'

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Multipart form data required' }, { status: 400 })
  }

  // ── Rate limiting ───────────────────────────────────────────────────────────
  const clientIp  = getIP(req)
  const rateCheck = checkRateLimit(clientIp, isPro)
  if (!rateCheck.allowed) {
    const retryAfter = Math.ceil(rateCheck.resetIn / 1000)
    return NextResponse.json(
      { error: 'error.rateLimited', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const formData = await req.formData()
  const files    = formData.getAll('file') as File[]
  const language = (formData.get('language') as Language) ?? 'en'
  const requestedProvider = formData.get('provider') as string | null
  const forcedProvider    = isPro ? (requestedProvider as ProviderName | null) : 'gemini'

  if (!files.length) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  // ── Read ALL file buffers upfront (File can only be read once) ──────────────
  const fileBuffers: Buffer[] = []
  for (const file of files) {
    fileBuffers.push(Buffer.from(await file.arrayBuffer()))
  }

  // ── Free tier checks ────────────────────────────────────────────────────────
  if (!isPro) {
    if (files.length > 1) {
      return NextResponse.json({ error: 'error.freeOneFile', upgrade: true }, { status: 403 })
    }

    if (files[0].size > FREE_MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'error.freeSizeLimit', upgrade: true }, { status: 403 })
    }

    // Honeypot — bots fill hidden fields, humans don't
    const honeypot = formData.get('_email_confirm') as string | null
    if (honeypot) {
      // Silent block — return fake success to confuse bots
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Turnstile CAPTCHA verification
    const turnstileToken = formData.get('cf-turnstile-response') as string | null
    if (!turnstileToken) {
      return NextResponse.json({ error: 'error.captchaRequired' }, { status: 403 })
    }
    const ip = getIP(req)
    const captchaOk = await verifyTurnstile(turnstileToken, ip)
    if (!captchaOk) {
      return NextResponse.json({ error: 'error.captchaFailed' }, { status: 403 })
    }

    // Check 1: IP + browser fingerprint
    const fingerprint = getFingerprint(req)
    if (await hasUsedFreeTier(fingerprint)) {
      return NextResponse.json({ error: 'error.freeUsed', upgrade: true }, { status: 403 })
    }

    // Check 2: account owner name (pre-scan without calling AI)
    const mime = files[0].type || guessMime(files[0].name)
    let rawText = ''

    if (TEXT_TYPES.has(mime) || /\.(csv|txt)$/i.test(files[0].name)) {
      rawText = fileBuffers[0].toString('utf8')
    } else if (mime === 'application/pdf') {
      try {
        const { extractPdfText } = await import('@/lib/providers/vision-utils')
        rawText = await extractPdfText(fileBuffers[0])
      } catch { /* pdfjs unavailable — skip owner check, rely on fingerprint */ }
    }

    if (rawText) {
      const detectedOwner = quickExtractOwner(rawText)
      if (detectedOwner && await hasOwnerUsedFreeTier(detectedOwner)) {
        return NextResponse.json({ error: 'error.freeUsed', upgrade: true }, { status: 403 })
      }
    }
  }

  // ── Process files (buffers already in memory) ───────────────────────────────
  const results: any[] = []
  let autoReason = ''

  for (let i = 0; i < files.length; i++) {
    const file   = files[i]
    const buffer = fileBuffers[i]
    const mime   = file.type || guessMime(file.name)

    try {
      if (TEXT_TYPES.has(mime) || /\.(csv|txt)$/i.test(file.name)) {
        const raw  = buffer.toString('utf8')
        const text = mime === 'text/csv' || file.name.endsWith('.csv') ? parseCSV(raw) : raw
        const resolved = forcedProvider ?? autoSelectProvider(mime, text.length, isPro)
        autoReason = `text (${(text.length / 1000).toFixed(1)}k chars → ${resolved})`
        results.push(await getProvider(resolved).analyze(text, language))

      } else if (VISION_TYPES.has(mime) || /\.(pdf|png|jpe?g|gif|webp|bmp)$/i.test(file.name)) {
        const resolved = forcedProvider ?? autoSelectProvider(mime, 0, isPro)
        const ai = getProvider(resolved)
        if (!ai.supportsVision) {
          return NextResponse.json({ error: `${ai.displayName} does not support vision` }, { status: 400 })
        }
        const fileData: FileData = { buffer, mimeType: mime, name: file.name }
        autoReason = `vision (${mime} → ${resolved})`
        results.push(await ai.analyzeFile(fileData, language))

      } else {
        return NextResponse.json(
          { error: `Unsupported file: ${file.name} (${mime}). Use PDF, image, CSV or TXT.` },
          { status: 400 }
        )
      }
    } catch (err) {
      return handleError(err as Error)
    }
  }

  // ── Merge results ───────────────────────────────────────────────────────────
  const merged = mergeResults(results)

  // ── Record API usage per model ──────────────────────────────────────────────
  const usedProvider = forcedProvider ?? autoSelectProvider(files[0].type || guessMime(files[0].name), 0, isPro)
  await recordApiUsage(usedProvider, isPro ? 'pro' : 'free')

  // ── Record free usage AFTER successful analysis ─────────────────────────────
  if (!isPro) {
    const fingerprint  = getFingerprint(req)
    const ip           = getIP(req)
    const accountOwner = (merged.accountOwner as string | undefined) ?? ''
    await recordFreeUsage(fingerprint, ip, accountOwner)
  }

  // ── Save analysis if Pro user opted in to storage ───────────────────────────
  let savedId: string | null = null
  if (isPro && userId) {
    const userRow = await getUserById(userId)
    if (userRow?.storageOptIn) {
      const finalProvider = forcedProvider ?? autoSelectProvider(files[0].type || guessMime(files[0].name), 0, isPro)
      savedId = await saveAnalysis(userId, files.map(f => f.name).join(', '), merged, finalProvider)
    }
  }

  const finalProvider = forcedProvider ?? autoSelectProvider(files[0].type || guessMime(files[0].name), 0, isPro)

  return NextResponse.json({
    ...merged,
    _meta: {
      provider:        finalProvider,
      tier:            isPro ? 'pro' : 'free',
      autoReason,
      fileCount:       files.length,
      savedAnalysisId: savedId,
    },
  })
}

// ── Merge multiple AnalysisResult objects into one ─────────────────────────────
function mergeResults(results: any[]): any {
  if (results.length === 1) return results[0]
  return {
    currency:         results[0].currency,
    accountOwner:     results[0].accountOwner ?? '',
    period:           results.map((r: any) => r.period).filter(Boolean).join(', '),
    detectedAccounts: [...new Set(results.flatMap((r: any) => r.detectedAccounts ?? []))],
    summary:          results.map((r: any) => r.summary).join(' '),
    transactions:     results.flatMap((r: any) => r.transactions),
    subscriptions:    results.flatMap((r: any) => r.subscriptions),
    regularPayments:  results.flatMap((r: any) => r.regularPayments),
    investments:      results.flatMap((r: any) => r.investments),
    transfers:        results.flatMap((r: any) => r.transfers),
    categories:       mergeCategories(results.flatMap((r: any) => r.categories)),
    monthlyTotals:    results.flatMap((r: any) => r.monthlyTotals).sort((a: any, b: any) => a.month.localeCompare(b.month)),
    insights:         results.flatMap((r: any) => r.insights),
    totalSpend:       results.reduce((s: number, r: any) => s + (r.totalSpend ?? 0), 0),
  }
}

function mergeCategories(cats: any[]) {
  const map = new Map<string, { total: number; count: number }>()
  for (const c of cats) {
    const ex = map.get(c.category) ?? { total: 0, count: 0 }
    map.set(c.category, { total: ex.total + c.total, count: ex.count + c.count })
  }
  return Array.from(map.entries()).map(([category, { total, count }]) => ({ category, total, count }))
}

function handleError(err: Error) {
  const msg = err.message
  if (msg.includes('JSON') || msg.includes('parse'))
    return NextResponse.json({ error: 'error.invalidJson' }, { status: 500 })
  if (msg.includes('503') || msg.includes('overloaded'))
    return NextResponse.json({ error: 'error.modelOverloaded' }, { status: 503 })
  if (msg.includes('401') || msg.includes('API key'))
    return NextResponse.json({ error: 'error.apiKey' }, { status: 401 })
  return NextResponse.json({ error: msg }, { status: 500 })
}

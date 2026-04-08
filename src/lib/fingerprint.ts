import crypto from 'crypto'
import { NextRequest } from 'next/server'

/**
 * Generates a fingerprint for anonymous free-tier limiting.
 * Combines IP + User-Agent + Accept-Language for reasonable uniqueness.
 * Not perfect (VPNs can bypass) but stops casual reuse.
 */
export function getFingerprint(req: NextRequest): string {
  const ip = getIP(req)
  const ua = req.headers.get('user-agent') ?? 'unknown'
  const lang = req.headers.get('accept-language') ?? ''

  const raw = `${ip}::${ua}::${lang}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  )
}

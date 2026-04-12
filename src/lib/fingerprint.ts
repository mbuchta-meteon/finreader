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

// Vercel injects country code for free — no API needed
export function getCountry(req: NextRequest): string | null {
  return req.headers.get('x-vercel-ip-country') ?? null
}

// Map country code → language code
// Falls back to 'en' for unlisted countries
const COUNTRY_LANG: Record<string, string> = {
  // Czech & Slovak
  CZ: 'cs', SK: 'cs',
  // German
  DE: 'de', AT: 'de', CH: 'de', LI: 'de', LU: 'de',
  // French
  FR: 'fr', BE: 'fr', MC: 'fr', SN: 'fr', CI: 'fr',
  // Italian
  IT: 'it', SM: 'it', VA: 'it',
  // Portuguese
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt',
  // Polish
  PL: 'pl',
  // Hungarian
  HU: 'hu',
}

export function countryToLang(country: string | null): string | null {
  if (!country) return null
  return COUNTRY_LANG[country.toUpperCase()] ?? null
}

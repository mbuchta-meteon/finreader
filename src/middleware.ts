import { NextRequest, NextResponse } from 'next/server'
import { checkAuthRateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/fingerprint'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rate limit auth endpoints to prevent email bombing / OAuth abuse.
  // Exclusions:
  //   /api/auth/session    — polled by NextAuth on every page load, must never be blocked
  //   /api/auth/csrf       — fetched on every form render
  //   /api/auth/providers  — fetched on sign-in page load
  //   /api/auth/callback/* — OAuth providers redirect here, blocking causes login failure
  const EXCLUDED = ['/api/auth/session', '/api/auth/csrf', '/api/auth/providers']
  const isExcluded = EXCLUDED.includes(pathname) || pathname.startsWith('/api/auth/callback/')

  if (pathname.startsWith('/api/auth/') && !isExcluded) {
    const ip = getIP(req)
    const { allowed, resetIn } = checkAuthRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(resetIn / 1000)) } }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/auth/:path*'],
}

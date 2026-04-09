import { NextRequest, NextResponse } from 'next/server'
import { checkAuthRateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/fingerprint'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rate limit auth endpoints to prevent email bombing / OAuth abuse
  if (pathname.startsWith('/api/auth/')) {
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

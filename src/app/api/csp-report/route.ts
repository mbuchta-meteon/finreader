import { NextRequest, NextResponse } from 'next/server'

// Browsers POST here when CSP blocks a resource
// Useful for: detecting attacks + finding false positives in your CSP rules
export async function POST(req: NextRequest) {
  try {
    const report = await req.json()
    const violation = report['csp-report'] ?? report

    // Log to console — Vercel captures these in function logs
    console.warn('[CSP Violation]', JSON.stringify({
      blockedUri:  violation['blocked-uri'],
      violatedDir: violation['violated-directive'],
      sourceFile:  violation['source-file'],
      lineNumber:  violation['line-number'],
    }))
  } catch {}

  return new NextResponse(null, { status: 204 })
}

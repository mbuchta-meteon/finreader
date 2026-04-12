import { NextRequest, NextResponse } from 'next/server'
import { recordPageView } from '@/lib/db'
import { getFingerprint, getCountry, countryToLang } from '@/lib/fingerprint'

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json()
    const fingerprint = getFingerprint(req)
    await recordPageView(fingerprint, path ?? '/')

    // Return detected country + suggested language so the client can auto-set language
    const country  = getCountry(req)
    const language = countryToLang(country)
    return NextResponse.json({ ok: true, country, language })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

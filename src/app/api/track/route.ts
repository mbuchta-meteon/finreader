import { NextRequest, NextResponse } from 'next/server'
import { recordPageView } from '@/lib/db'
import { getFingerprint } from '@/lib/fingerprint'

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json()
    const fingerprint = getFingerprint(req)
    await recordPageView(fingerprint, path ?? '/')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

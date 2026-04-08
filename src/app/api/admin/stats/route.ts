import { NextRequest, NextResponse } from 'next/server'
import { getAdminStats } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { secret } = await req.json()
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const stats = await getAdminStats()
  return NextResponse.json(stats)
}

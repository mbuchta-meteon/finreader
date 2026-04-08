import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getUserAnalyses, getAnalysisById, deleteAnalysis,
  deleteAllUserAnalyses, updateStorageOptIn, getUserById,
} from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  const userId  = session?.user?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (id) {
    const analysis = await getAnalysisById(id, userId)
    if (!analysis) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(analysis)
  }

  const analyses = await getUserAnalyses(userId)
  return NextResponse.json({ analyses })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  const userId  = session?.user?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id  = searchParams.get('id')
  const all = searchParams.get('all')

  if (all === 'true') {
    await deleteAllUserAnalyses(userId)
    return NextResponse.json({ ok: true, deleted: 'all' })
  }
  if (id) {
    await deleteAnalysis(id, userId)
    return NextResponse.json({ ok: true, deleted: id })
  }
  return NextResponse.json({ error: 'Missing id or all param' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  const userId  = session?.user?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { storageOptIn } = await req.json()
  await updateStorageOptIn(userId, !!storageOptIn)
  const user = await getUserById(userId)
  return NextResponse.json({ ok: true, storageOptIn: !!user?.storageOptIn })
}

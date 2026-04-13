import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await query(`UPDATE outreach_queue SET status = 'skipped' WHERE id = $1`, [parseInt(id)])
  return NextResponse.json({ success: true })
}

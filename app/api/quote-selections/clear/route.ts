import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { run } from '@/lib/db'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await run(
    `UPDATE quote_selections SET status = 'submitted' WHERE user_id = $1 AND status = 'saved'`,
    [session.user.id]
  )
  return NextResponse.json({ ok: true })
}

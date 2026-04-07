import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { auth } from '@/lib/auth'

// GET /api/crm/pricing/[stoneId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ stoneId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const roleGet = (session.user as { role?: string })?.role
  if (roleGet !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { stoneId } = await params
  const db = getDb()
  const row = db.prepare('SELECT * FROM stone_prices WHERE stone_id = ?').get(stoneId)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

// PATCH /api/crm/pricing/[stoneId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ stoneId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rolePatch = (session.user as { role?: string })?.role
  if (rolePatch !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { stoneId } = await params
  const body = await req.json()
  const db = getDb()

  const userName = session.user?.name || session.user?.email || 'admin'

  const result = db.prepare(`
    UPDATE stone_prices SET
      dealer_cost_sqft = COALESCE(?, dealer_cost_sqft),
      retail_sqft = COALESCE(?, retail_sqft),
      slab_width_inches = COALESCE(?, slab_width_inches),
      slab_height_inches = COALESCE(?, slab_height_inches),
      notes = COALESCE(?, notes),
      updated_at = datetime('now'),
      updated_by = ?
    WHERE stone_id = ?
  `).run(
    body.dealer_cost_sqft ?? null,
    body.retail_sqft ?? null,
    body.slab_width_inches ?? null,
    body.slab_height_inches ?? null,
    body.notes ?? null,
    userName,
    stoneId
  )

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = db.prepare('SELECT * FROM stone_prices WHERE stone_id = ?').get(stoneId)
  return NextResponse.json(updated)
}

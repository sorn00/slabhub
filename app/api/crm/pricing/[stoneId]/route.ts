import { NextRequest, NextResponse } from 'next/server'
import { queryOne, run } from '@/lib/db'
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
  const row = await queryOne(`
    SELECT id AS stone_id, name AS stone_name, material, brand, series,
      price_per_sf AS retail_sqft, dealer_cost_sqft, slab_price,
      slab_width_inches, slab_height_inches, image_url, description, thickness,
      style, primary_color, finish_options AS finish, tags, in_stock, availability,
      stock_sqft, stock_slabs, is_promo, promo_slab_price AS promo_price_per_slab,
      promo_qty, notes, updated_by, slug
    FROM stones WHERE id = $1
  `, [stoneId])
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

  const userName = session.user?.name || session.user?.email || 'admin'

  const result = await run(`
    UPDATE stones SET
      dealer_cost_sqft = COALESCE($1, dealer_cost_sqft),
      price_per_sf = COALESCE($2, price_per_sf),
      slab_width_inches = COALESCE($3, slab_width_inches),
      slab_height_inches = COALESCE($4, slab_height_inches),
      notes = COALESCE($5, notes),
      updated_by = $6
    WHERE id = $7
  `, [
    body.dealer_cost_sqft ?? null,
    body.retail_sqft ?? null,
    body.slab_width_inches ?? null,
    body.slab_height_inches ?? null,
    body.notes ?? null,
    userName,
    stoneId
  ])

  if ((result.rowCount ?? 0) === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await queryOne(`
    SELECT id AS stone_id, name AS stone_name, material, brand, series,
      price_per_sf AS retail_sqft, dealer_cost_sqft, slab_price,
      slab_width_inches, slab_height_inches, image_url, description, thickness,
      style, primary_color, finish_options AS finish, tags, in_stock, availability,
      stock_sqft, stock_slabs, is_promo, promo_slab_price AS promo_price_per_slab,
      promo_qty, notes, updated_by, slug
    FROM stones WHERE id = $1
  `, [stoneId])
  return NextResponse.json(updated)
}

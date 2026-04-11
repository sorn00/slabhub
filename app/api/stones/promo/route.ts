import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db-postgres'

export async function GET() {
  const pool = getPool()

  try {
    const result = await pool.query(`
      SELECT 
        id, stone_id, stone_name, material, primary_color, style,
        slab_width_inches, slab_height_inches,
        image_url, closeup_url, tags, notes,
        is_promo, promo_price_per_slab, promo_qty
      FROM stone_prices
      WHERE is_promo = true
      ORDER BY promo_price_per_slab ASC
    `)

    return NextResponse.json({ stones: result.rows })
  } catch (err) {
    console.error('Promo stones error:', err)
    return NextResponse.json({ error: 'Failed to load promo stones' }, { status: 500 })
  }
}

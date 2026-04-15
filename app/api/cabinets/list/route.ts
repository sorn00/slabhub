import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export interface CabinetRow {
  sku: string
  name: string
  category: string
  subcategory: string
  width_inches: number | null
  height_inches: number | null
  depth_inches: number | null
}

export async function GET() {
  try {
    const pool = getPool()
    const result = await pool.query<CabinetRow>(
      `SELECT sku, name, category, subcategory,
              width_inches::float  AS width_inches,
              height_inches::float AS height_inches,
              depth_inches::float  AS depth_inches
       FROM cabinets
       WHERE category = 'base_cabinet'
       ORDER BY subcategory, width_inches NULLS LAST, sku`
    )
    return NextResponse.json(result.rows)
  } catch {
    return NextResponse.json({ error: 'Failed to load cabinets' }, { status: 500 })
  }
}

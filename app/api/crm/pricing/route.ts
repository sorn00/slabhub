import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, run } from '@/lib/db'
import { auth } from '@/lib/auth'
import path from 'path'
import fs from 'fs'

// GET /api/crm/pricing — return all stone prices
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string })?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await query('SELECT * FROM stone_prices ORDER BY stone_name ASC')
  return NextResponse.json(rows)
}

// POST /api/crm/pricing — bulk upsert stone prices (also handles seed from catalog)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rolePost = (session.user as { role?: string })?.role
  if (rolePost !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Support { action: 'seed' } to pre-populate from msi-catalog.json
  if (body.action === 'seed') {
    const catalogPath = path.join(process.cwd(), 'public', 'data', 'msi-catalog.json')
    if (!fs.existsSync(catalogPath)) {
      return NextResponse.json({ error: 'msi-catalog.json not found' }, { status: 500 })
    }

    const catalog: Array<{ id: string; name: string; material: string }> = JSON.parse(
      fs.readFileSync(catalogPath, 'utf-8')
    )

    const existing = await queryOne('SELECT COUNT(*) as count FROM stone_prices')
    const existingCount = parseInt(existing?.count ?? '0', 10)
    if (existingCount > 0) {
      return NextResponse.json({ message: 'Already seeded', count: existingCount })
    }

    // Known prices
    const knownPrices: Record<string, { dealer: number; retail: number }> = {
      'calacatta-adonia': { dealer: 26.40, retail: 33.34 },
      'calacatta-alto':   { dealer: 26.40, retail: 35.06 },
    }

    for (const s of catalog) {
      const known = knownPrices[s.id]
      await run(
        `INSERT INTO stone_prices (stone_id, stone_name, material, dealer_cost_sqft, retail_sqft)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (stone_id) DO NOTHING`,
        [s.id, s.name, s.material, known?.dealer ?? null, known?.retail ?? null]
      )
    }

    const countRow = await queryOne('SELECT COUNT(*) as count FROM stone_prices')
    const count = parseInt(countRow?.count ?? '0', 10)
    return NextResponse.json({ message: 'Seeded', count })
  }

  // Bulk upsert: body should be array of stone price rows
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected array of stone prices' }, { status: 400 })
  }

  const userName = session.user?.name || session.user?.email || 'admin'

  for (const row of body) {
    await run(`
      INSERT INTO stone_prices (stone_id, stone_name, material, dealer_cost_sqft, retail_sqft, slab_width_inches, slab_height_inches, notes, updated_at, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      ON CONFLICT (stone_id) DO UPDATE SET
        stone_name = EXCLUDED.stone_name,
        material = EXCLUDED.material,
        dealer_cost_sqft = EXCLUDED.dealer_cost_sqft,
        retail_sqft = EXCLUDED.retail_sqft,
        slab_width_inches = EXCLUDED.slab_width_inches,
        slab_height_inches = EXCLUDED.slab_height_inches,
        notes = EXCLUDED.notes,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
    `, [
      row.stone_id, row.stone_name, row.material,
      row.dealer_cost_sqft ?? null, row.retail_sqft ?? null,
      row.slab_width_inches ?? 130, row.slab_height_inches ?? 79,
      row.notes ?? null, userName
    ])
  }

  return NextResponse.json({ message: 'Upserted', count: body.length })
}

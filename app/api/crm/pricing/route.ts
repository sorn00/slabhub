import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { auth } from '@/lib/auth'
import path from 'path'
import fs from 'fs'

// GET /api/crm/pricing — return all stone prices
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string })?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getDb()
  const rows = db.prepare('SELECT * FROM stone_prices ORDER BY stone_name ASC').all()
  return NextResponse.json(rows)
}

// POST /api/crm/pricing — bulk upsert stone prices (also handles seed from catalog)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rolePost = (session.user as { role?: string })?.role
  if (rolePost !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getDb()
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

    const existing = db.prepare('SELECT COUNT(*) as count FROM stone_prices').get() as { count: number }
    if (existing.count > 0) {
      return NextResponse.json({ message: 'Already seeded', count: existing.count })
    }

    const insert = db.prepare(`
      INSERT OR IGNORE INTO stone_prices (stone_id, stone_name, material, dealer_cost_sqft, retail_sqft)
      VALUES (?, ?, ?, ?, ?)
    `)

    // Known prices
    const knownPrices: Record<string, { dealer: number; retail: number }> = {
      'calacatta-adonia': { dealer: 26.40, retail: 33.34 },
      'calacatta-alto':   { dealer: 26.40, retail: 35.06 },
    }

    const seedMany = db.transaction((stones: typeof catalog) => {
      for (const s of stones) {
        const known = knownPrices[s.id]
        insert.run(
          s.id,
          s.name,
          s.material,
          known?.dealer ?? null,
          known?.retail ?? null,
        )
      }
    })

    seedMany(catalog)

    const count = (db.prepare('SELECT COUNT(*) as count FROM stone_prices').get() as { count: number }).count
    return NextResponse.json({ message: 'Seeded', count })
  }

  // Bulk upsert: body should be array of stone price rows
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected array of stone prices' }, { status: 400 })
  }

  const upsert = db.prepare(`
    INSERT INTO stone_prices (stone_id, stone_name, material, dealer_cost_sqft, retail_sqft, slab_width_inches, slab_height_inches, notes, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(stone_id) DO UPDATE SET
      stone_name = excluded.stone_name,
      material = excluded.material,
      dealer_cost_sqft = excluded.dealer_cost_sqft,
      retail_sqft = excluded.retail_sqft,
      slab_width_inches = excluded.slab_width_inches,
      slab_height_inches = excluded.slab_height_inches,
      notes = excluded.notes,
      updated_at = datetime('now'),
      updated_by = excluded.updated_by
  `)

  const userName = session.user?.name || session.user?.email || 'admin'

  const upsertMany = db.transaction((rows: typeof body) => {
    for (const row of rows) {
      upsert.run(
        row.stone_id, row.stone_name, row.material,
        row.dealer_cost_sqft ?? null, row.retail_sqft ?? null,
        row.slab_width_inches ?? 130, row.slab_height_inches ?? 79,
        row.notes ?? null, userName
      )
    }
  })

  upsertMany(body)
  return NextResponse.json({ message: 'Upserted', count: body.length })
}

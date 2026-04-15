import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

interface QuoteBody {
  name: string
  email: string
  phone?: string
  city?: string
  state?: string
  project_type?: string
  cabinet_styles?: string
  preferred_tier?: string
  room_count?: number
  timeline?: string
  notes?: string
  cabinet_selections?: CabinetSelection[]
}

interface CabinetSelection {
  sku: string
  name: string
  qty: number
  dimensions: string
}

// POST — submit a new quote request
export async function POST(req: NextRequest) {
  try {
    const body: QuoteBody = await req.json()

    if (!body.name || !body.email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
    }

    const pool = getPool()
    const result = await pool.query(
      `INSERT INTO cabinet_quote_requests
        (name, email, phone, city, state, project_type, cabinet_styles,
         preferred_tier, room_count, timeline, notes, cabinet_selections, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'new')
       RETURNING id`,
      [
        body.name,
        body.email,
        body.phone ?? null,
        body.city ?? null,
        body.state ?? null,
        body.project_type ?? null,
        body.cabinet_styles ?? null,
        body.preferred_tier ?? null,
        body.room_count ?? 1,
        body.timeline ?? null,
        body.notes ?? null,
        body.cabinet_selections ? JSON.stringify(body.cabinet_selections) : null,
      ]
    )

    return NextResponse.json({ success: true, id: result.rows[0].id })
  } catch (e) {
    console.error('cabinet quote POST error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET — list all quote requests (admin)
export async function GET() {
  try {
    const pool = getPool()
    const result = await pool.query(
      `SELECT id, name, email, phone, city, state, project_type,
              cabinet_styles, preferred_tier, timeline, notes,
              cabinet_selections, status, created_at
       FROM cabinet_quote_requests
       ORDER BY created_at DESC`
    )
    return NextResponse.json(result.rows)
  } catch (e) {
    console.error('cabinet quote GET error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH — update status
export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json() as { id: number; status: string }
    const allowed = ['new', 'contacted', 'closed']
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const pool = getPool()
    await pool.query(
      'UPDATE cabinet_quote_requests SET status=$1 WHERE id=$2',
      [status, id]
    )
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('cabinet quote PATCH error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

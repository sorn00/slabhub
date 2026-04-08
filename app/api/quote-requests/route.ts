import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query, run } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  // Admin can update status
  const adminSession = req.cookies.get('admin_session')
  if (adminSession?.value !== 'valid') {
    const session = await auth()
    const role = (session?.user as { role?: string })?.role
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { id, status } = await req.json()
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
  }

  await run('UPDATE quote_requests SET status = $1 WHERE id = $2', [status, id])
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { stone_id, stone_name, customer_name, phone, sqft_estimate, notes, layout, sink_type, stones } = body

  if (!customer_name || !phone) {
    return NextResponse.json({ error: 'customer_name and phone are required' }, { status: 400 })
  }

  // Multi-stone mode: stones array provided
  if (stones && Array.isArray(stones) && stones.length > 0) {
    // Use first stone as primary for legacy columns
    const primary = stones[0]
    const result = await run(
      `INSERT INTO quote_requests (user_id, stone_id, stone_name, customer_name, phone, sqft_estimate, notes, layout, sink_type, stones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        session.user.id,
        primary.stoneId || '',
        primary.stoneName || '',
        customer_name,
        phone,
        sqft_estimate ?? null,
        notes ?? null,
        layout ?? null,
        sink_type ?? null,
        JSON.stringify(stones),
      ]
    )
    return NextResponse.json({ id: result.rows[0].id })
  }

  // Single stone mode (legacy)
  if (!stone_id) {
    return NextResponse.json({ error: 'stone_id or stones array is required' }, { status: 400 })
  }

  const result = await run(
    `INSERT INTO quote_requests (user_id, stone_id, stone_name, customer_name, phone, sqft_estimate, notes, layout, sink_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [session.user.id, stone_id, stone_name ?? null, customer_name, phone, sqft_estimate ?? null, notes ?? null, layout ?? null, sink_type ?? null]
  )

  return NextResponse.json({ id: result.rows[0].id })
}

export async function GET(req: NextRequest) {
  // Check for admin cookie first
  const adminSession = req.cookies.get('admin_session')
  if (adminSession?.value === 'valid') {
    const requests = await query(`
      SELECT qr.*, u.name as user_name, u.email as user_email,
             qf.filename as quote_file, qf.original_name as quote_file_name,
             qf.uploaded_at as quote_file_uploaded_at
      FROM quote_requests qr
      JOIN users u ON u.id = qr.user_id
      LEFT JOIN quote_files qf ON qf.quote_request_id = qr.id
      ORDER BY qr.created_at DESC
    `)
    return NextResponse.json(requests.map(r => ({
      ...r,
      stones: typeof r.stones === 'string' ? JSON.parse(r.stones) : (r.stones ?? null),
    })))
  }

  // Otherwise require customer NextAuth session
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requests = await query(`
    SELECT qr.*,
           qf.filename as quote_file, qf.original_name as quote_file_name,
           qf.uploaded_at as quote_file_uploaded_at
    FROM quote_requests qr
    LEFT JOIN quote_files qf ON qf.quote_request_id = qr.id
    WHERE qr.user_id = $1
    ORDER BY qr.created_at DESC
  `, [session.user.id])

  return NextResponse.json(requests.map(r => ({
    ...r,
    stones: typeof r.stones === 'string' ? JSON.parse(r.stones) : (r.stones ?? null),
  })))
}

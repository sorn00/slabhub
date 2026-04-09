import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query, run, queryOne } from '@/lib/db'
import { sendLeadConfirmationEmail } from '@/lib/email'

const GHL_TOKEN = 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const GHL_LOCATION = 'qhOziWzmOO7mYbl3U7tm'
const GHL_PIPELINE = '7CiRMsaloPKQHYt2EF4r'
const GHL_STAGE_QUALIFIED = '232e769f-28d9-43a6-b921-ea28467a0835' // Qualified stage

async function createGHLContact(name: string, phone: string, email?: string) {
  try {
    const [firstName, ...rest] = name.trim().split(' ')
    const lastName = rest.join(' ') || ''
    const res = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: GHL_LOCATION, firstName, lastName, phone, email: email || undefined, tags: ['quarriva_lead'] })
    })
    const data = await res.json()
    return data.contact?.id || null
  } catch { return null }
}

async function createGHLOpportunity(contactId: string, name: string, stones: string, sqft?: number) {
  try {
    const stoneList = stones || 'Quarriva website request'
    const res = await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: GHL_LOCATION,
        pipelineId: GHL_PIPELINE,
        pipelineStageId: GHL_STAGE_QUALIFIED,
        contactId,
        name: `${name} — ${stoneList}${sqft ? ` (${sqft} sqft)` : ''}`,
        status: 'open',
        source: 'Quarriva Website'
      })
    })
    const data = await res.json()
    return data.opportunity?.id || null
  } catch { return null }
}

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
    const primary = stones[0]
    const result = await run(
      `INSERT INTO quote_requests (user_id, stone_id, stone_name, customer_name, phone, sqft_estimate, notes, layout, sink_type, stones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [session.user.id, primary.stoneId || '', primary.stoneName || '', customer_name, phone, sqft_estimate ?? null, notes ?? null, layout ?? null, sink_type ?? null, JSON.stringify(stones)]
    )
    // Sync to GHL in background
    const stoneNames = (stones as Array<{ stoneName?: string }>).map(s => s.stoneName).filter(Boolean).join(', ')
    createGHLContact(customer_name, phone, (session.user as { email?: string })?.email)
      .then(ghlId => { if (ghlId) createGHLOpportunity(ghlId, customer_name, stoneNames, sqft_estimate) })
      .catch(() => {})
    // Send confirmation email (fire and forget)
    const userRow = await queryOne('SELECT email FROM users WHERE id = $1', [session.user.id])
    if (userRow?.email) {
      sendLeadConfirmationEmail({
        to: userRow.email,
        customerName: customer_name,
        stoneNames,
        sqft: sqft_estimate,
        layout,
      }).catch(() => {})
    }
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
  // Sync to GHL in background
  createGHLContact(customer_name, phone, (session.user as { email?: string })?.email)
    .then(ghlId => { if (ghlId) createGHLOpportunity(ghlId, customer_name, stone_name || stone_id, sqft_estimate) })
    .catch(() => {})
  // Send confirmation email (fire and forget)
  const userRow = await queryOne('SELECT email FROM users WHERE id = $1', [session.user.id])
  if (userRow?.email) {
    sendLeadConfirmationEmail({
      to: userRow.email,
      customerName: customer_name,
      stoneNames: stone_name || stone_id || 'your selection',
      sqft: sqft_estimate,
      layout,
    }).catch(() => {})
  }

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

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query, run, queryOne } from '@/lib/db'
import { sendLeadConfirmationEmail } from '@/lib/email'

const GHL_TOKEN = process.env.GHL_TOKEN || ''
const GHL_LOCATION = process.env.GHL_LOCATION_ID || 'qhOziWzmOO7mYbl3U7tm'
const GHL_PIPELINE = process.env.GHL_PIPELINE_ID || '7CiRMsaloPKQHYt2EF4r'
const GHL_STAGE_QUALIFIED = process.env.GHL_STAGE_QUALIFIED || '8bc331fb-0887-4d64-80e3-ced5eb95f19e'
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID || ''

async function createGHLContact(name: string, phone: string, email?: string) {
  if (!GHL_TOKEN) return null

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

async function findGHLContactByEmail(email: string): Promise<string | null> {
  if (!GHL_TOKEN) return null

  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${GHL_LOCATION}&email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-07-28' } }
    )
    const data = await res.json()
    return data?.contact?.id || null
  } catch { return null }
}

async function notifySorn(message: string) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT) return

  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: message })
    })
  } catch { /* silent */ }
}

async function sendGHLSMS(contactId: string, message: string) {
  if (!GHL_TOKEN) return

  try {
    // Find conversation
    const convRes = await fetch(
      `https://services.leadconnectorhq.com/conversations/search?locationId=${GHL_LOCATION}&contactId=${contactId}&limit=1`,
      { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-04-15' } }
    )
    const convData = await convRes.json()
    let conversationId = convData?.conversations?.[0]?.id

    // Create conversation if none
    if (!conversationId) {
      const newConv = await fetch('https://services.leadconnectorhq.com/conversations/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-04-15', 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: GHL_LOCATION, contactId })
      })
      const newConvData = await newConv.json()
      conversationId = newConvData?.conversation?.id
    }

    if (!conversationId) return

    await fetch('https://services.leadconnectorhq.com/conversations/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-04-15', 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SMS', conversationId, message })
    })
  } catch { /* silent */ }
}

async function createGHLOpportunity(contactId: string, name: string, stones: string, sqft?: number) {
  if (!GHL_TOKEN) return null

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

  if (!customer_name) {
    return NextResponse.json({ error: 'customer_name is required' }, { status: 400 })
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
    const firstName = customer_name.split(' ')[0]
    const userEmail = (session.user as { email?: string })?.email || ''
    ;(async () => {
      // Check if contact already exists in GHL by email
      let ghlId = userEmail ? await findGHLContactByEmail(userEmail) : null
      if (ghlId) {
        // Existing contact — add note to their conversation
        await sendGHLSMS(ghlId, `🔔 ${customer_name} submitted a new quote request via Quarriva for: ${stoneNames}${sqft_estimate ? ` (${sqft_estimate} sqft est.)` : ''}. Check Quarriva admin for details.`)
      } else {
        // New contact — create and send confirmation
        ghlId = await createGHLContact(customer_name, phone, userEmail)
        if (ghlId) {
          await createGHLOpportunity(ghlId, customer_name, stoneNames, sqft_estimate)
          await sendGHLSMS(ghlId, `Hi ${firstName}! We received your quote request for ${stoneNames}. We'll review and get back to you within 24 hours. — Quarriva`)
        }
      }
      // Always notify Sorn
      await notifySorn(`🔥 New Quarriva quote request\n\n👤 ${customer_name}\n📞 ${phone}\n🪊 ${stoneNames}${sqft_estimate ? `\n📏 ${sqft_estimate} sqft` : ''}${notes ? `\n📝 ${notes}` : ''}\n\nquarriva.com/admin`)
    })().catch(() => {})
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
  const firstName2 = customer_name.split(' ')[0]
  const userEmail2 = (session.user as { email?: string })?.email || ''
  ;(async () => {
    let ghlId2 = userEmail2 ? await findGHLContactByEmail(userEmail2) : null
    if (ghlId2) {
      await sendGHLSMS(ghlId2, `🔔 ${customer_name} submitted a new quote request via Quarriva for: ${stone_name || stone_id}. Check Quarriva admin for details.`)
    } else {
      ghlId2 = await createGHLContact(customer_name, phone, userEmail2)
      if (ghlId2) {
        await createGHLOpportunity(ghlId2, customer_name, stone_name || stone_id, sqft_estimate)
        await sendGHLSMS(ghlId2, `Hi ${firstName2}! We received your quote request for ${stone_name || stone_id}. We'll review and get back to you within 24 hours. — Quarriva`)
      }
    }
    await notifySorn(`🔥 New Quarriva quote request\n\n👤 ${customer_name}\n📞 ${phone}\n🪊 ${stone_name || stone_id}${sqft_estimate ? `\n📏 ${sqft_estimate} sqft` : ''}\n\nquarriva.com/admin`)
  })().catch(() => {})
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
             qf.uploaded_at as quote_file_uploaded_at,
             COUNT(qm.id) FILTER (WHERE qm.sender = 'user' AND qm.read_at IS NULL) as unread_count,
             COUNT(qm.id) as message_count
      FROM quote_requests qr
      JOIN users u ON u.id = qr.user_id
      LEFT JOIN quote_files qf ON qf.quote_request_id = qr.id
      LEFT JOIN quote_messages qm ON qm.quote_request_id = qr.id
      GROUP BY qr.id, u.name, u.email, qf.filename, qf.original_name, qf.uploaded_at
      ORDER BY qr.created_at DESC
    `)
    return NextResponse.json(requests.map(r => ({
      ...r,
      stones: typeof r.stones === 'string' ? JSON.parse(r.stones) : (r.stones ?? null),
      unread_count: parseInt(r.unread_count || '0'),
      message_count: parseInt(r.message_count || '0'),
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
           qf.uploaded_at as quote_file_uploaded_at,
           COUNT(qm.id) FILTER (WHERE qm.sender = 'admin' AND qm.read_at IS NULL) as unread_count,
           COUNT(qm.id) as message_count
    FROM quote_requests qr
    LEFT JOIN quote_files qf ON qf.quote_request_id = qr.id
    LEFT JOIN quote_messages qm ON qm.quote_request_id = qr.id
    WHERE qr.user_id = $1
    GROUP BY qr.id, qf.filename, qf.original_name, qf.uploaded_at
    ORDER BY qr.created_at DESC
  `, [session.user.id])

  return NextResponse.json(requests.map(r => ({
    ...r,
    stones: typeof r.stones === 'string' ? JSON.parse(r.stones) : (r.stones ?? null),
    unread_count: parseInt(r.unread_count || '0'),
    message_count: parseInt(r.message_count || '0'),
  })))
}

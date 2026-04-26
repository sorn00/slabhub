import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID || ''

async function sendTelegram(text: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' }),
    })
  } catch {
    // silent
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fabricatorId, fabricatorName, city, name, email, phone, projectType, message } = body as {
      fabricatorId: number
      fabricatorName: string
      city: string
      name: string
      email: string
      phone?: string
      projectType?: string
      message?: string
    }

    if (!fabricatorId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const pool = getPool()

    // Save to quote_requests table (adding fabricator_id column if needed)
    // First ensure the column exists
    await pool.query(`
      ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS fabricator_id INTEGER REFERENCES directory_fabricators(id);
      ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS customer_email TEXT;
      ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS project_type TEXT;
      ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS message TEXT;
    `).catch(() => {
      // Non-fatal — columns may already exist
    })

    // Insert quote request
    // quote_requests requires user_id but for directory leads we use 0 or handle gracefully
    await pool.query(`
      INSERT INTO quote_requests (
        user_id, stone_id, stone_name, customer_name, phone, notes, status,
        fabricator_id, customer_email, project_type, message
      ) VALUES (
        0, 'directory-lead', $1, $2, $3, $4, 'pending',
        $5, $6, $7, $8
      )
    `, [
      `Directory lead — ${fabricatorName}`,
      name,
      phone || null,
      message || null,
      fabricatorId,
      email,
      projectType || null,
      message || null,
    ]).catch(async () => {
      // Fallback: insert without user_id constraint issues
      await pool.query(`
        INSERT INTO quote_requests (
          user_id, stone_id, stone_name, customer_name, phone, notes, status
        ) VALUES (0, 'directory-lead', $1, $2, $3, $4, 'pending')
      `, [`Directory lead — ${fabricatorName}`, name, phone || null, message || null])
    })

    // Increment lead count on fabricator
    await pool.query(
      `UPDATE directory_fabricators SET lead_count = COALESCE(lead_count, 0) + 1, updated_at = NOW() WHERE id = $1`,
      [fabricatorId]
    )

    // Telegram notification
    const tgMsg = `🏭 <b>Quote request for ${fabricatorName}</b> in ${city}\n👤 ${name}\n📧 ${email}${phone ? `\n📞 ${phone}` : ''}${projectType ? `\n🔧 ${projectType}` : ''}${message ? `\n💬 ${message}` : ''}`
    await sendTelegram(tgMsg)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Quote request error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

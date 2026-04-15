import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

const TELEGRAM_TOKEN = '8505355085:AAHvIPt6KPoRosDoYavhObjhsylK_qp96Q4'
const TELEGRAM_CHAT = '5027057965'

async function sendTelegram(text: string) {
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
    const { fabricatorId, fabricatorSlug, fabricatorName, name, email, phone, role } = body as {
      fabricatorId: number
      fabricatorSlug: string
      fabricatorName: string
      name: string
      email: string
      phone?: string
      role: string
    }

    if (!fabricatorId || !name || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const pool = getPool()

    // Save claim request
    await pool.query(`
      INSERT INTO directory_claim_requests (fabricator_id, name, email, phone, role, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
    `, [fabricatorId, name, email, phone || null, role])

    // Telegram notification
    const profileUrl = `https://quarriva.com/directory/${fabricatorSlug}`
    const tgMsg = `📋 <b>Claim request: ${fabricatorName}</b>\n👤 ${name} (${role})\n📧 ${email}${phone ? `\n📞 ${phone}` : ''}\n🔗 ${profileUrl}`
    await sendTelegram(tgMsg)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Claim request error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

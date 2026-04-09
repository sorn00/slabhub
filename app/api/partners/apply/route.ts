import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db-postgres'
import nodemailer from 'nodemailer'

const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  return mailer.sendMail({
    from: `"Quarriva" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  })
}

const TELEGRAM_BOT = '8505355085:AAHvIPt6KPoRosDoYavhObjhsylK_qp96Q4'
const TELEGRAM_CHAT = '5027057965'

async function sendTelegram(text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' }),
    })
  } catch (e) {
    console.error('Telegram error:', e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { citySlug, companyName, contactName, phone, email, website } = body

    if (!citySlug || !companyName || !contactName || !phone || !email) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    const pool = getPool()

    // Check if city is still available
    const marketResult = await pool.query(
      `SELECT city_slug, city_name, state, status FROM partner_markets WHERE city_slug = $1`,
      [citySlug]
    )

    if (marketResult.rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Market not found' }, { status: 404 })
    }

    const market = marketResult.rows[0]

    if (market.status === 'claimed') {
      return NextResponse.json({ ok: true, status: 'taken' })
    }

    // Save application
    await pool.query(
      `INSERT INTO partner_applications (city_slug, company_name, contact_name, phone, email, website, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [citySlug, companyName, contactName, phone, email, website || null]
    )

    // Send Telegram alert
    const telegramMsg = `🏭 <b>NEW PARTNER APPLICATION</b>

<b>Company:</b> ${companyName}
<b>Contact:</b> ${contactName}
<b>Phone:</b> ${phone}
<b>City:</b> ${market.city_name}, ${market.state}
<b>Email:</b> ${email}${website ? `\n<b>Website:</b> ${website}` : ''}

Approve at: https://quarriva.com/crm/partners`

    await sendTelegram(telegramMsg)

    // Send confirmation email to fabricator
    try {
      await sendEmail({
        to: email,
        subject: `Application Received — ${market.city_name}, ${market.state} Territory`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: #1a1a2e; padding: 24px; text-align: center;">
              <h1 style="color: #d4a847; margin: 0; font-size: 28px; letter-spacing: 2px;">QUARRIVA</h1>
              <p style="color: #888; margin: 6px 0 0; font-size: 13px;">Premium Stone Countertops</p>
            </div>
            <div style="padding: 32px; background: #ffffff;">
              <h2 style="color: #1a1a2e; margin-top: 0;">Application Received ✅</h2>
              <p>Hi ${contactName},</p>
              <p>We received your application to become the exclusive Quarriva partner for <strong>${market.city_name}, ${market.state}</strong>.</p>
              <div style="background: #f8f8f8; border-left: 4px solid #d4a847; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-weight: 700; color: #1a1a2e;">What happens next:</p>
                <ul style="margin: 12px 0 0; color: #555;">
                  <li>Our team reviews your application (usually within 24 hours)</li>
                  <li>We'll call you to confirm details and territory exclusivity</li>
                  <li>Once approved, you start receiving qualified leads immediately</li>
                </ul>
              </div>
              <p><strong>Your territory:</strong> ${market.city_name}, ${market.state}<br/>
              <strong>Lead price:</strong> $200 per qualified lead<br/>
              <strong>Contract:</strong> None — cancel anytime</p>
              <p style="color: #888; font-size: 13px;">Questions? Reply to this email or call us directly.</p>
            </div>
            <div style="background: #1a1a2e; padding: 16px; text-align: center;">
              <p style="color: #555; font-size: 12px; margin: 0;">Quarriva · quarriva.com</p>
            </div>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error('Email send error:', emailErr)
    }

    return NextResponse.json({ ok: true, status: 'pending' })

  } catch (err) {
    console.error('Apply error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

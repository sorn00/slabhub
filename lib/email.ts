import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

function baseTemplate(content: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: #1a1a2e; padding: 24px; text-align: center;">
        <h1 style="color: #d4a847; margin: 0; font-size: 28px; letter-spacing: 2px;">QUARRIVA</h1>
        <p style="color: #888; margin: 6px 0 0; font-size: 13px;">Premium Stone Countertops</p>
      </div>
      <div style="padding: 32px; background: #ffffff;">
        ${content}
      </div>
      <div style="background: #1a1a2e; padding: 16px; text-align: center;">
        <p style="color: #555; font-size: 12px; margin: 0;">
          Arts Marble &amp; Granite · 765 Waverly St, Framingham MA 01702 · (508) 309-3735
        </p>
        <p style="color: #444; font-size: 11px; margin: 4px 0 0;">
          Powered by <a href="https://quarriva.com" style="color: #d4a847; text-decoration: none;">Quarriva</a>
        </p>
      </div>
    </div>
  `
}

export async function sendQuoteEmail({
  to,
  customerName,
  stoneNames,
  quoteUrl,
  sqft,
}: {
  to: string
  customerName: string
  stoneNames: string
  quoteUrl?: string
  sqft?: number
}) {
  const content = `
    <h2 style="color: #1a1a2e; margin-top: 0;">Hi ${customerName},</h2>
    <p style="color: #444; line-height: 1.6;">
      Thank you for your interest in <strong>${stoneNames}</strong>${sqft ? ` for your ${sqft} sqft project` : ''}.
      Please find your countertop quote below.
    </p>
    ${quoteUrl ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${quoteUrl}" style="background: #d4a847; color: #1a1a2e; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
        📄 View Your Quote →
      </a>
    </div>
    ` : ''}
    <p style="color: #444; line-height: 1.6;">
      Have questions? Reply to this email or give us a call — we're happy to walk you through everything.
    </p>
    <p style="color: #444; margin-top: 24px;">
      Best regards,<br>
      <strong>Arts Marble &amp; Granite Team</strong>
    </p>
  `

  await transporter.sendMail({
    from: `"Arts Marble & Granite" <${process.env.GMAIL_FROM || 'quotes@quarriva.com'}>`,
    to,
    subject: `Your Countertop Quote — ${stoneNames}`,
    html: baseTemplate(content),
  })
}

export async function sendLeadConfirmationEmail({
  to,
  customerName,
  stoneNames,
  sqft,
  layout,
}: {
  to: string
  customerName: string
  stoneNames: string
  sqft?: number
  layout?: string
}) {
  const content = `
    <h2 style="color: #1a1a2e; margin-top: 0;">Hi ${customerName}, we got your request! 🎉</h2>
    <p style="color: #444; line-height: 1.6;">
      We've received your quote request for <strong>${stoneNames}</strong>${sqft ? ` (${sqft} sqft${layout ? ' · ' + layout : ''})` : ''}.
    </p>
    <div style="background: #f5f5f5; border-left: 4px solid #d4a847; padding: 16px; margin: 24px 0; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; color: #333; font-weight: bold;">What happens next:</p>
      <ul style="color: #555; margin: 8px 0 0; padding-left: 20px; line-height: 1.8;">
        <li>Our team reviews your project details</li>
        <li>We prepare pricing for your selected stones</li>
        <li>You'll hear from us within <strong>24 hours</strong></li>
      </ul>
    </div>
    <p style="color: #444; line-height: 1.6;">
      Questions in the meantime? Call us at <strong>(508) 309-3735</strong> or just reply to this email.
    </p>
    <p style="color: #444; margin-top: 24px;">
      Best regards,<br>
      <strong>Arts Marble &amp; Granite Team</strong>
    </p>
  `

  await transporter.sendMail({
    from: `"Arts Marble & Granite" <${process.env.GMAIL_FROM || 'quotes@quarriva.com'}>`,
    to,
    subject: `We received your quote request — ${stoneNames}`,
    html: baseTemplate(content),
  })
}

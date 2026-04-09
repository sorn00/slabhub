import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sendQuoteEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!session || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { to, customerName, stoneNames, quoteUrl, sqft } = await req.json()

  if (!to || !customerName) {
    return NextResponse.json({ error: 'to and customerName are required' }, { status: 400 })
  }

  try {
    await sendQuoteEmail({ to, customerName, stoneNames: stoneNames || 'your stone selection', quoteUrl, sqft })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Email send error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
